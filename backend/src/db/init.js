const db = require('./index');

const createTables = async () => {
  try {
    console.log('Initializing database tables...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
        stock INTEGER NOT NULL CHECK (stock >= 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      );
    `);

    await db.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
              CREATE TYPE order_status AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
          END IF;
      END$$;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        total_price DECIMAL(10, 2) NOT NULL,
        status order_status DEFAULT 'COMPLETED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        price DECIMAL(10, 2) NOT NULL
      );
    `);

    // Indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);`);

    console.log('Database tables created successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

if (require.main === module) {
  createTables().then(() => process.exit(0));
}

module.exports = createTables;
