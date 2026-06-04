import { Router } from 'express';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

export const profileRouter = Router();

// Get profile
profileRouter.get('/', authenticate, async (req, res) => {
  const result = await query(
    'SELECT * FROM user_profiles WHERE user_id = $1',
    [req.user.id]
  );
  res.json(result.rows[0] || null);
});

// Create or update profile
profileRouter.put('/', authenticate, async (req, res) => {
  const { full_name, phone, street, city, postal_code, country } = req.body;

  const existing = await query('SELECT id FROM user_profiles WHERE user_id = $1', [req.user.id]);

  if (existing.rows.length > 0) {
    const result = await query(
      `UPDATE user_profiles SET
        full_name = $1, phone = $2, street = $3,
        city = $4, postal_code = $5, country = $6, updated_at = NOW()
       WHERE user_id = $7 RETURNING *`,
      [full_name, phone, street, city, postal_code, country, req.user.id]
    );
    res.json(result.rows[0]);
  } else {
    const result = await query(
      `INSERT INTO user_profiles (user_id, full_name, phone, street, city, postal_code, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, full_name, phone, street, city, postal_code, country]
    );
    res.json(result.rows[0]);
  }
});
