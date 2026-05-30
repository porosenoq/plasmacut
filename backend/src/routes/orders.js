import { Router } from 'express';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

export const ordersRouter = Router();

ordersRouter.post('/', authenticate, async (req, res) => {
  const { quote_id, delivery_address, notes } = req.body;

  const quoteResult = await query(
    'SELECT * FROM quotes WHERE id = $1 AND user_id = $2',
    [quote_id, req.user.id]
  );
  const quote = quoteResult.rows[0];
  if (!quote) return res.status(404).json({ error: 'Quote not found' });

  await query(
    'UPDATE quotes SET status = $1 WHERE id = $2',
    ['ordered', quote_id]
  );

  const result = await query(
    `INSERT INTO orders (quote_id, user_id, delivery_address, notes)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [quote_id, req.user.id, JSON.stringify(delivery_address || {}), notes || null]
  );

  res.status(201).json(result.rows[0]);
});

ordersRouter.get('/', authenticate, async (req, res) => {
  const result = await query(
    `SELECT o.*, q.total_price, q.material, q.cutting_method, q.quantity,
            f.original_name
     FROM orders o
     JOIN quotes q ON q.id = o.quote_id
     JOIN dxf_files f ON f.id = q.file_id
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  res.json(result.rows);
});

ordersRouter.get('/:id', authenticate, async (req, res) => {
  const result = await query(
    `SELECT o.*, q.*, f.original_name
     FROM orders o
     JOIN quotes q ON q.id = o.quote_id
     JOIN dxf_files f ON f.id = q.file_id
     WHERE o.id = $1 AND o.user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });
  res.json(result.rows[0]);
});
