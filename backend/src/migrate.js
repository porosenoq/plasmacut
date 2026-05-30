import { pool } from './db.js';

const schema = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dxf_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  svg_content TEXT,
  bounding_box_w_mm NUMERIC,
  bounding_box_h_mm NUMERIC,
  cut_length_mm NUMERIC,
  entity_count INTEGER,
  hole_count INTEGER,
  open_contours INTEGER DEFAULT 0,
  parsed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_id UUID REFERENCES dxf_files(id) ON DELETE CASCADE,
  cutting_method TEXT NOT NULL CHECK (cutting_method IN ('laser','plasma')),
  material TEXT NOT NULL,
  thickness_mm NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_material_cost NUMERIC NOT NULL,
  unit_cutting_cost NUMERIC NOT NULL,
  setup_fee NUMERIC NOT NULL DEFAULT 5.00,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','ordered')),
  notes TEXT,
  valid_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id),
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_production','shipped','delivered','cancelled')),
  stripe_payment_intent TEXT,
  delivery_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_user ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_files_user ON dxf_files(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
`;

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(schema);
    console.log('Database schema ready');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}
