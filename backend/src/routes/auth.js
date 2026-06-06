const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();

router.post(
  '/signup',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // Check if user already exists
      const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (userCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insert user
      const result = await db.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
        [name, email, hashedPassword]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const user = userResult.rows[0];

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const payload = {
        user_id: user.id,
        email: user.email,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  }
);

module.exports = router;
