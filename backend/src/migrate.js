import { pool } from './db.js';

const schema = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
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

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_production','shipped','delivered','cancelled')),
  delivery_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_id UUID REFERENCES dxf_files(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  cutting_method TEXT NOT NULL CHECK (cutting_method IN ('laser','plasma')),
  material TEXT NOT NULL,
  thickness_mm NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_material_cost NUMERIC NOT NULL,
  unit_cutting_cost NUMERIC NOT NULL,
  setup_fee NUMERIC NOT NULL DEFAULT 0.16,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','ordered')),
  weight_kg NUMERIC,
  total_weight_kg NUMERIC,
  notes TEXT,
  valid_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe column additions for existing deployments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_admin') THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='order_id') THEN
    ALTER TABLE quotes ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='weight_kg') THEN
    ALTER TABLE quotes ADD COLUMN weight_kg NUMERIC;
    ALTER TABLE quotes ADD COLUMN total_weight_kg NUMERIC;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quotes_user ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_order ON quotes(order_id);
CREATE INDEX IF NOT EXISTS idx_files_user ON dxf_files(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
`;

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(schema);
    console.log('Database schema ready');
    await seedAdmin(client);
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function seedAdmin(client) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) {
    console.log('No ADMIN_EMAIL/ADMIN_PASSWORD set — skipping admin seed');
    return;
  }

  const existing = await client.query('SELECT id, is_admin FROM users WHERE email = $1', [email]);

  if (existing.rows.length > 0) {
    if (!existing.rows[0].is_admin) {
      await client.query('UPDATE users SET is_admin = true WHERE email = $1', [email]);
      console.log(`Promoted ${email} to admin`);
    } else {
      console.log(`Admin user ${email} already exists`);
    }
    return;
  }

  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.default.hash(password, 10);
  await client.query(
    `INSERT INTO users (email, password_hash, name, is_admin) VALUES ($1, $2, $3, true)`,
    [email.toLowerCase(), hash, name]
  );
  console.log(`Admin user created: ${email}`);
}

// Profile table migration (appended)
export async function runProfileMigration() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT,
        phone TEXT,
        street TEXT,
        city TEXT,
        postal_code TEXT,
        country TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='phone') THEN
          ALTER TABLE orders ADD COLUMN phone TEXT;
        END IF;
      END $$;
    `);
    console.log('Profile schema ready');
  } catch (err) {
    console.error('Profile migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Marketplace migration (appended)
export async function runMarketplaceMigration() {
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_provider') THEN
          ALTER TABLE users ADD COLUMN is_provider BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='provider_id') THEN
          ALTER TABLE orders ADD COLUMN provider_id UUID REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='posted_to_marketplace') THEN
          ALTER TABLE orders ADD COLUMN posted_to_marketplace BOOLEAN DEFAULT TRUE;
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='claimed_at') THEN
          ALTER TABLE orders ADD COLUMN claimed_at TIMESTAMPTZ;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS provider_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        equipment TEXT,
        max_thickness_mm NUMERIC,
        cutting_methods TEXT[],
        location TEXT,
        notes TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider_id);
      CREATE INDEX IF NOT EXISTS idx_provider_apps_user ON provider_applications(user_id);
    `);
    console.log('Marketplace schema ready');
  } catch (err) {
    console.error('Marketplace migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Add provider payout columns to quotes
export async function runPayoutMigration() {
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='provider_unit_payout') THEN
          ALTER TABLE quotes ADD COLUMN provider_unit_payout NUMERIC;
          ALTER TABLE quotes ADD COLUMN provider_total_payout NUMERIC;
        END IF;
      END $$;
    `);
    console.log('Payout schema ready');
  } catch (err) {
    console.error('Payout migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}
