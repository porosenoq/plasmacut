import { Router } from 'express';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { sendOrderConfirmation, sendAdminOrderAlert, sendStatusUpdate } from '../services/email.js';
import { generateQuotePdf } from '../services/pdf.js';

export const ordersRouter = Router();

// Create order from one or more quotes
ordersRouter.post('/', authenticate, async (req, res) => {
  const { quote_ids, delivery_address, notes, phone } = req.body;

  if (!quote_ids?.length) return res.status(400).json({ error: 'quote_ids array required' });
  if (!delivery_address?.street || !delivery_address?.city || !delivery_address?.postal_code || !delivery_address?.country) {
    return res.status(400).json({ error: 'Full delivery address required' });
  }

  // Verify all quotes belong to user
  const placeholders = quote_ids.map((_, i) => `$${i + 2}`).join(',');
  const quotesResult = await query(
    `SELECT q.*, f.original_name FROM quotes q
     JOIN dxf_files f ON f.id = q.file_id
     WHERE q.id IN (${placeholders}) AND q.user_id = $1`,
    [req.user.id, ...quote_ids]
  );

  if (quotesResult.rows.length !== quote_ids.length) {
    return res.status(404).json({ error: 'One or more quotes not found' });
  }

  const items = quotesResult.rows;

  // Create order
  const orderResult = await query(
    `INSERT INTO orders (user_id, delivery_address, phone, notes)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user.id, JSON.stringify(delivery_address), phone || null, notes || null]
  );
  const order = orderResult.rows[0];

  // Link quotes to order and mark as ordered
  for (const qid of quote_ids) {
    await query('UPDATE quotes SET status = $1, order_id = $2 WHERE id = $3', ['ordered', order.id, qid]);
  }

  // Get user info
  const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = userResult.rows[0];

  // Send emails (non-blocking)
  Promise.all([
    sendOrderConfirmation({ order, items, user, address: delivery_address }),
    sendAdminOrderAlert({ order, items, user, address: delivery_address }),
  ]).catch(err => console.error('Email error:', err.message));

  res.status(201).json({ order, items });
});

// Get all orders (user)
ordersRouter.get('/', authenticate, async (req, res) => {
  const result = await query(
    `SELECT o.*,
       json_agg(json_build_object(
         'id', q.id, 'original_name', f.original_name, 'file_id', f.id,
         'cutting_method', q.cutting_method, 'material', q.material,
         'thickness_mm', q.thickness_mm, 'quantity', q.quantity,
         'unit_price', q.unit_price, 'total_price', q.total_price
       )) as items,
       SUM(q.total_price) as subtotal
     FROM orders o
     JOIN quotes q ON q.order_id = o.id
     JOIN dxf_files f ON f.id = q.file_id
     WHERE o.user_id = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  res.json(result.rows);
});

// Get single order
ordersRouter.get('/:id', authenticate, async (req, res) => {
  const result = await query(
    `SELECT o.*,
       json_agg(json_build_object(
         'id', q.id, 'original_name', f.original_name, 'file_id', f.id,
         'cutting_method', q.cutting_method, 'material', q.material,
         'thickness_mm', q.thickness_mm, 'quantity', q.quantity,
         'unit_price', q.unit_price, 'total_price', q.total_price
       )) as items,
       SUM(q.total_price) as subtotal
     FROM orders o
     JOIN quotes q ON q.order_id = o.id
     JOIN dxf_files f ON f.id = q.file_id
     WHERE o.id = $1 AND o.user_id = $2
     GROUP BY o.id`,
    [req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });
  res.json(result.rows[0]);
});

// Download PDF quote (works for both customer and admin)
ordersRouter.get('/:id/pdf', authenticate, async (req, res) => {
  const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const isAdmin = userResult.rows[0]?.is_admin;

  // Admins can download any order's PDF, customers only their own
  const orderQuery = isAdmin
    ? `SELECT o.*,
         json_agg(json_build_object(
           'id', q.id, 'original_name', f.original_name, 'file_id', f.id,
           'cutting_method', q.cutting_method, 'material', q.material,
           'thickness_mm', q.thickness_mm, 'quantity', q.quantity,
           'unit_price', q.unit_price, 'total_price', q.total_price
         )) as items
       FROM orders o
       JOIN quotes q ON q.order_id = o.id
       JOIN dxf_files f ON f.id = q.file_id
       WHERE o.id = $1
       GROUP BY o.id`
    : `SELECT o.*,
         json_agg(json_build_object(
           'id', q.id, 'original_name', f.original_name, 'file_id', f.id,
           'cutting_method', q.cutting_method, 'material', q.material,
           'thickness_mm', q.thickness_mm, 'quantity', q.quantity,
           'unit_price', q.unit_price, 'total_price', q.total_price
         )) as items
       FROM orders o
       JOIN quotes q ON q.order_id = o.id
       JOIN dxf_files f ON f.id = q.file_id
       WHERE o.id = $1 AND o.user_id = $2
       GROUP BY o.id`;

  const params = isAdmin ? [req.params.id] : [req.params.id, req.user.id];
  const result = await query(orderQuery, params);
  if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });

  const order = result.rows[0];

  // For PDF, show the customer's info not the admin's
  const ownerResult = await query('SELECT * FROM users WHERE id = $1', [order.user_id]);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="cutquote-${order.id.slice(0,8)}.pdf"`);

  generateQuotePdf({
    order,
    items: order.items,
    user: ownerResult.rows[0],
    address: order.delivery_address,
    res,
  });
});

// Admin: update order status
ordersRouter.patch('/:id/status', authenticate, async (req, res) => {
  // Check admin
  const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!userResult.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin only' });

  const { status } = req.body;
  const valid = ['pending','confirmed','in_production','shipped','delivered','cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const result = await query(
    'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });

  // Get order owner and send email
  const ownerResult = await query('SELECT * FROM users WHERE id = $1', [result.rows[0].user_id]);
  sendStatusUpdate({ order: result.rows[0], user: ownerResult.rows[0], newStatus: status })
    .catch(err => console.error('Email error:', err.message));

  res.json(result.rows[0]);
});

// Admin: get all orders
ordersRouter.get('/admin/all', authenticate, async (req, res) => {
  const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!userResult.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin only' });

  const result = await query(
    `SELECT o.*,
       u.name as customer_name, u.email as customer_email,
       json_agg(json_build_object(
         'original_name', f.original_name, 'file_id', f.id, 'cutting_method', q.cutting_method,
         'material', q.material, 'thickness_mm', q.thickness_mm,
         'quantity', q.quantity, 'total_price', q.total_price
       )) as items,
       SUM(q.total_price) as subtotal
     FROM orders o
     JOIN users u ON u.id = o.user_id
     JOIN quotes q ON q.order_id = o.id
     JOIN dxf_files f ON f.id = q.file_id
     GROUP BY o.id, u.id
     ORDER BY o.created_at DESC`
  );
  res.json(result.rows);
});
