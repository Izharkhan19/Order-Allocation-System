const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const db = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  return res.json("Server is running, this is an Health check route")
  console.log("Server is running, this is an Health check route")
})

// Routes
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);


// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  await db.testConnection();
  console.log(`Server is running on port ${PORT}`);
});
