import { Router } from 'express';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { sendProviderClaimedNotice } from '../services/email.js';

export const marketplaceRouter = Router();

const ORDER_ITEMS_JSON = `json_agg(json_build_object(
  'id', q.id, 'original_name', f.original_name, 'file_id', f.id,
  'cutting_method', q.cutting_method, 'material', q.material,
  'thickness_mm', q.thickness_mm, 'quantity', q.quantity,
  'unit_price', q.unit_price, 'total_price', q.total_price,
  'weight_kg', q.weight_kg, 'total_weight_kg', q.total_weight_kg,
  'provider_unit_payout', q.provider_unit_payout, 'provider_total_payout', q.provider_total_payout,
  'bounding_box_w_mm', f.bounding_box_w_mm, 'bounding_box_h_mm', f.bounding_box_h_mm,
  'svg_content', f.svg_content
))`;

// ── Job board: list open orders not yet claimed ──────────────────
marketplaceRouter.get('/jobs', authenticate, async (req, res) => {
  const result = await query(
    `SELECT o.id, o.status, o.created_at, o.delivery_address, o.claimed_at,
       ${ORDER_ITEMS_JSON} as items,
       SUM(q.total_price) as subtotal,
       SUM(q.provider_total_payout) as total_payout,
       SUM(q.total_weight_kg) as total_weight
     FROM orders o
     JOIN quotes q ON q.order_id = o.id
     JOIN dxf_files f ON f.id = q.file_id
     WHERE o.posted_to_marketplace = TRUE AND o.provider_id IS NULL AND o.status != 'cancelled'
     GROUP BY o.id
     ORDER BY o.created_at DESC`
  );
  res.json(result.rows);
});

// ── Claim a job (provider only) ──────────────────────────────────
marketplaceRouter.post('/jobs/:id/claim', authenticate, async (req, res) => {
  const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!userResult.rows[0]?.is_provider) {
    return res.status(403).json({ error: 'You must be an approved provider to claim jobs' });
  }

  // Atomic claim - only succeeds if still unclaimed
  const result = await query(
    `UPDATE orders SET provider_id = $1, claimed_at = NOW(), status = 'confirmed'
     WHERE id = $2 AND provider_id IS NULL AND status != 'cancelled'
     RETURNING *`,
    [req.user.id, req.params.id]
  );

  if (!result.rows[0]) {
    return res.status(409).json({ error: 'This job has already been claimed by another provider' });
  }

  // Notify customer
  const itemsResult = await query(
    `SELECT ${ORDER_ITEMS_JSON} as items, SUM(q.total_price) as subtotal
     FROM quotes q JOIN dxf_files f ON f.id = q.file_id
     WHERE q.order_id = $1 GROUP BY q.order_id`,
    [req.params.id]
  );
  const customerResult = await query('SELECT * FROM users WHERE id = $1', [result.rows[0].user_id]);

  sendProviderClaimedNotice({
    order: result.rows[0],
    items: itemsResult.rows[0]?.items || [],
    customer: customerResult.rows[0],
    provider: userResult.rows[0],
  }).catch(err => console.error('Email error:', err.message));

  res.json(result.rows[0]);
});

// ── Provider dashboard: jobs claimed by this provider ────────────
marketplaceRouter.get('/my-jobs', authenticate, async (req, res) => {
  const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!userResult.rows[0]?.is_provider) {
    return res.status(403).json({ error: 'Not a provider' });
  }

  const result = await query(
    `SELECT o.*, u.name as customer_name, u.email as customer_email,
       ${ORDER_ITEMS_JSON} as items,
       SUM(q.total_price) as subtotal,
       SUM(q.provider_total_payout) as total_payout,
       SUM(q.total_weight_kg) as total_weight
     FROM orders o
     JOIN users u ON u.id = o.user_id
     JOIN quotes q ON q.order_id = o.id
     JOIN dxf_files f ON f.id = q.file_id
     WHERE o.provider_id = $1
     GROUP BY o.id, u.id
     ORDER BY o.claimed_at DESC`,
    [req.user.id]
  );
  res.json(result.rows);
});

// ── Provider updates status on their claimed job ─────────────────
marketplaceRouter.patch('/my-jobs/:id/status', authenticate, async (req, res) => {
  const { status } = req.body;
  const valid = ['in_production', 'shipped', 'delivered'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const result = await query(
    `UPDATE orders SET status = $1, updated_at = NOW()
     WHERE id = $2 AND provider_id = $3 RETURNING *`,
    [status, req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Job not found or not yours' });
  res.json(result.rows[0]);
});

// ── Provider application ──────────────────────────────────────────
marketplaceRouter.post('/apply', authenticate, async (req, res) => {
  const { equipment, max_thickness_mm, cutting_methods, location, notes } = req.body;

  // Check for existing pending/approved application
  const existing = await query(
    `SELECT * FROM provider_applications WHERE user_id = $1 AND status = 'pending'`,
    [req.user.id]
  );
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'You already have a pending application' });
  }

  const result = await query(
    `INSERT INTO provider_applications (user_id, equipment, max_thickness_mm, cutting_methods, location, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.id, equipment, max_thickness_mm, cutting_methods, location, notes]
  );
  res.status(201).json(result.rows[0]);
});

// Get my application status
marketplaceRouter.get('/apply/status', authenticate, async (req, res) => {
  const result = await query(
    `SELECT * FROM provider_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [req.user.id]
  );
  const userResult = await query('SELECT is_provider FROM users WHERE id = $1', [req.user.id]);
  res.json({
    is_provider: userResult.rows[0]?.is_provider || false,
    application: result.rows[0] || null,
  });
});

// ── Admin: list all provider applications ─────────────────────────
marketplaceRouter.get('/admin/applications', authenticate, async (req, res) => {
  const userResult = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
  if (!userResult.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin only' });

  const result = await query(
    `SELECT pa.*, u.name as user_name, u.email as user_email
     FROM provider_applications pa
     JOIN users u ON u.id = pa.user_id
     ORDER BY pa.created_at DESC`
  );
  res.json(result.rows);
});

// ── Admin: approve/reject application ──────────────────────────────
marketplaceRouter.patch('/admin/applications/:id', authenticate, async (req, res) => {
  const userResult = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
  if (!userResult.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin only' });

  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const result = await query(
    `UPDATE provider_applications SET status = $1, reviewed_at = NOW() WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Application not found' });

  if (status === 'approved') {
    await query('UPDATE users SET is_provider = TRUE WHERE id = $1', [result.rows[0].user_id]);
  }

  res.json(result.rows[0]);
});
