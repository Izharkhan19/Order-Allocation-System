const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a product
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a positive integer'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, stock } = req.body;

    try {
      const result = await db.query(
        'INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING *',
        [name, price, stock]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Soft delete product (Bonus)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
