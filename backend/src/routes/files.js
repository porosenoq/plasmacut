import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

export const filesRouter = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.dxf') {
      return cb(new Error('Only .dxf files are allowed'));
    }
    cb(null, true);
  },
});

filesRouter.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const dbResult = await query(
    `INSERT INTO dxf_files (user_id, original_name, stored_path) VALUES ($1, $2, $3) RETURNING *`,
    [req.user.id, req.file.originalname, req.file.path]
  );
  const fileRecord = dbResult.rows[0];

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), req.file.originalname);
    form.append('file_id', fileRecord.id);

    const parserRes = await fetch(`${process.env.PARSER_URL}/parse`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    if (!parserRes.ok) throw new Error('Parser service error');

    const parsed = await parserRes.json();

    const updated = await query(
      `UPDATE dxf_files SET
        bounding_box_w_mm = $1,
        bounding_box_h_mm = $2,
        cut_length_mm = $3,
        entity_count = $4,
        hole_count = $5,
        open_contours = $6,
        svg_path = $7,
        parsed_at = NOW()
       WHERE id = $8 RETURNING *`,
      [
        parsed.bbox_w, parsed.bbox_h, parsed.cut_length,
        parsed.entity_count, parsed.hole_count, parsed.open_contours,
        parsed.svg_path, fileRecord.id,
      ]
    );

    res.json({ file: updated.rows[0], parsed });
  } catch (err) {
    console.error('Parser error:', err.message);
    res.json({ file: fileRecord, parsed: null, warning: 'Parsing failed: ' + err.message });
  }
});

filesRouter.get('/', authenticate, async (req, res) => {
  const result = await query(
    'SELECT * FROM dxf_files WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(result.rows);
});

filesRouter.get('/:id', authenticate, async (req, res) => {
  const result = await query(
    'SELECT * FROM dxf_files WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'File not found' });
  res.json(result.rows[0]);
});

filesRouter.get('/:id/svg', authenticate, async (req, res) => {
  const result = await query(
    'SELECT * FROM dxf_files WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  const file = result.rows[0];
  if (!file) return res.status(404).json({ error: 'File not found' });
  if (!file.svg_path || !fs.existsSync(file.svg_path)) {
    return res.status(404).json({ error: 'SVG not yet generated' });
  }
  res.setHeader('Content-Type', 'image/svg+xml');
  fs.createReadStream(file.svg_path).pipe(res);
});

filesRouter.delete('/:id', authenticate, async (req, res) => {
  const result = await query(
    'DELETE FROM dxf_files WHERE id = $1 AND user_id = $2 RETURNING *',
    [req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'File not found' });
  res.json({ success: true });
});
