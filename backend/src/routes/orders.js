const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all order routes
router.use(authenticateToken);

const orderLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each user to 5 requests per `window` (here, per minute)
  message: { error: 'Too many orders created, please try again after a minute' },
  keyGenerator: (req) => req.user.user_id.toString(), // Use the authenticated user's ID
});

// Create Order
router.post('/', orderLimiter, [
    body('items').isArray({ min: 1 }).withMessage('Items must be an array with at least one item'),
    body('items.*.product_id').isInt().withMessage('Product ID must be an integer'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items } = req.body;
    const userId = req.user.user_id; // From JWT

    const client = await db.getClient();

    try {
      await client.query('BEGIN'); // Start transaction

      let totalPrice = 0;
      const orderItems = [];

      for (const item of items) {
        // Row-level locking to prevent race conditions during concurrent orders
        // `SELECT ... FOR UPDATE` locks the rows so other transactions must wait until this one completes
        const productRes = await client.query(
          'SELECT id, name, price, stock FROM products WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
          [item.product_id]
        );

        if (productRes.rows.length === 0) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }

        const product = productRes.rows[0];

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
        }

        // Deduct stock
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );

        const itemTotalPrice = parseFloat(product.price) * item.quantity;
        totalPrice += itemTotalPrice;

        orderItems.push({
          product_id: product.id,
          quantity: item.quantity,
          price: product.price,
        });
      }

      // Create Order
      const orderRes = await client.query(
        'INSERT INTO orders (user_id, total_price) VALUES ($1, $2) RETURNING *',
        [userId, totalPrice]
      );
      const order = orderRes.rows[0];

      // Insert Order Items
      for (const orderItem of orderItems) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
          [order.id, orderItem.product_id, orderItem.quantity, orderItem.price]
        );
      }

      await client.query('COMMIT'); // Commit transaction
      
      res.status(201).json({ message: 'Order created successfully', orderId: order.id, totalPrice });
    } catch (err) {
      await client.query('ROLLBACK'); // Rollback on error
      console.error('Order creation failed:', err.message); // Bonus: Logging for order failures
      res.status(400).json({ error: err.message || 'Failed to create order' });
    } finally {
      client.release();
    }
  }
);

// Cancel Order
router.patch('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Lock the order to prevent double cancellation
    const orderRes = await client.query(
      'SELECT id, user_id, status FROM orders WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (orderRes.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderRes.rows[0];

    if (order.user_id !== userId) {
      throw new Error('Unauthorized to cancel this order');
    }

    if (order.status === 'CANCELLED') {
      throw new Error('Order is already cancelled');
    }

    // Get order items
    const itemsRes = await client.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
      [order.id]
    );

    // Restore stock and lock products
    for (const item of itemsRes.rows) {
      // Lock the product to safely update stock
      await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      
      await client.query(
        'UPDATE products SET stock = stock + $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    // Update order status
    await client.query(
      "UPDATE orders SET status = 'CANCELLED' WHERE id = $1",
      [order.id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order cancellation failed:', err.message);
    res.status(400).json({ error: err.message || 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

// Get Orders with Pagination
router.get('/', async (req, res) => {
  const userId = req.user.user_id;
  
  // Parse pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    // Efficient query for total count
    const countRes = await db.query('SELECT COUNT(*) FROM orders WHERE user_id = $1', [userId]);
    const totalCount = parseInt(countRes.rows[0].count);

    // Fetch paginated results
    const ordersRes = await db.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    res.json({
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      orders: ordersRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
