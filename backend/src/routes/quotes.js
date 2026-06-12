import { Router } from 'express';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { calculateQuote, MATERIALS, THICKNESSES } from '../services/pricing.js';

export const quotesRouter = Router();

quotesRouter.get('/config', (req, res) => {
  res.json({ materials: MATERIALS, thicknesses: THICKNESSES });
});

quotesRouter.post('/calculate', authenticate, async (req, res) => {
  const { file_id, cutting_method, material, thickness_mm, quantity } = req.body;

  const fileResult = await query(
    'SELECT * FROM dxf_files WHERE id = $1 AND user_id = $2',
    [file_id, req.user.id]
  );
  const file = fileResult.rows[0];
  if (!file) return res.status(404).json({ error: 'File not found' });
  if (!file.cut_length_mm) return res.status(400).json({ error: 'File not yet parsed' });

  const pricing = calculateQuote({
    material,
    thicknessMm: Number(thickness_mm),
    method: cutting_method,
    cutLengthMm: Number(file.cut_length_mm),
    bboxWmm: Number(file.bounding_box_w_mm),
    bboxHmm: Number(file.bounding_box_h_mm),
    quantity: Number(quantity),
  });

  res.json({ ...pricing, file });
});

quotesRouter.post('/', authenticate, async (req, res) => {
  const { file_id, cutting_method, material, thickness_mm, quantity, notes } = req.body;

  const fileResult = await query(
    'SELECT * FROM dxf_files WHERE id = $1 AND user_id = $2',
    [file_id, req.user.id]
  );
  const file = fileResult.rows[0];
  if (!file) return res.status(404).json({ error: 'File not found' });

  const pricing = calculateQuote({
    material,
    thicknessMm: Number(thickness_mm),
    method: cutting_method,
    cutLengthMm: Number(file.cut_length_mm),
    bboxWmm: Number(file.bounding_box_w_mm),
    bboxHmm: Number(file.bounding_box_h_mm),
    quantity: Number(quantity),
  });

  const result = await query(
    `INSERT INTO quotes
      (user_id, file_id, cutting_method, material, thickness_mm, quantity,
       unit_material_cost, unit_cutting_cost, setup_fee, unit_price, total_price,
       weight_kg, total_weight_kg, provider_unit_payout, provider_total_payout, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
    [
      req.user.id, file_id, cutting_method, material, thickness_mm, quantity,
      pricing.unit_material_cost, pricing.unit_cutting_cost, pricing.setup_fee,
      pricing.unit_price, pricing.total_price,
      pricing.weight_kg, pricing.total_weight_kg,
      pricing.provider_unit_payout, pricing.provider_total_payout, notes || null,
    ]
  );

  res.status(201).json({ quote: result.rows[0], pricing });
});

quotesRouter.get('/', authenticate, async (req, res) => {
  const result = await query(
    `SELECT q.*, f.original_name, f.bounding_box_w_mm, f.bounding_box_h_mm, f.cut_length_mm, f.entity_count, f.hole_count, f.svg_content
     FROM quotes q
     JOIN dxf_files f ON f.id = q.file_id
     WHERE q.user_id = $1
     ORDER BY q.created_at DESC`,
    [req.user.id]
  );
  res.json(result.rows);
});

quotesRouter.get('/:id', authenticate, async (req, res) => {
  const result = await query(
    `SELECT q.*, f.original_name, f.bounding_box_w_mm, f.bounding_box_h_mm, f.cut_length_mm, f.entity_count, f.hole_count, f.svg_content,
            f.cut_length_mm, f.entity_count, f.hole_count
     FROM quotes q
     JOIN dxf_files f ON f.id = q.file_id
     WHERE q.id = $1 AND q.user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Quote not found' });
  res.json(result.rows[0]);
});

quotesRouter.delete('/:id', authenticate, async (req, res) => {
  await query('DELETE FROM quotes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true });
});
