import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const MATERIALS_FALLBACK = {
  mild_steel:      { label: 'Mild steel' },
  stainless_steel: { label: 'Stainless steel' },
  aluminium:       { label: 'Aluminium' },
  brass:           { label: 'Brass' },
  acrylic:         { label: 'Acrylic' },
};

export default function QuoteConfigurator({ file, onQuoteSaved }) {
  const [config, setConfig] = useState({ materials: MATERIALS_FALLBACK, thicknesses: [1,2,3,4,5,6,8,10,12,15,20] });
  const [form, setForm] = useState({ method: 'laser', material: 'mild_steel', thickness: 2, quantity: 1 });
  const [pricing, setPricing] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getQuoteConfig().then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (!file?.cut_length_mm) return;
    setError('');
    setCalculating(true);
    const t = setTimeout(() => {
      api.calculateQuote({
        file_id: file.id,
        cutting_method: form.method,
        material: form.material,
        thickness_mm: form.thickness,
        quantity: form.quantity,
      })
        .then(p => { setPricing(p); setCalculating(false); })
        .catch(e => { setError(e.message); setCalculating(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [form, file]);

  const set = (k) => (v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };

  const saveQuote = async () => {
    setSaving(true);
    try {
      const q = await api.saveQuote({
        file_id: file.id,
        cutting_method: form.method,
        material: form.material,
        thickness_mm: form.thickness,
        quantity: form.quantity,
      });
      setSaved(true);
      onQuoteSaved?.(q.quote);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ background: '#151a25', border: '1px solid #1e293b', borderRadius: 12 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>Configure & quote</span>
      </div>
      <div style={{ padding: 16 }}>

        <Section label="Cutting method">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[['plasma', '⚡', 'Plasma', '±0.5 mm — fast & economical'], ['laser', '🔥', 'Laser', '±0.1 mm — thin & precise']].map(([val, icon, name, desc]) => (
              <button key={val} onClick={() => set('method')(val)} style={{
                padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${form.method === val ? '#22d3a5' : '#1e293b'}`,
                background: form.method === val ? 'rgba(34,211,165,0.08)' : '#0f1117',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ fontSize: 16, marginBottom: 3 }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{desc}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section label="Material">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(config.materials).map(([key, mat]) => (
              <Chip key={key} active={form.material === key} onClick={() => set('material')(key)}>{mat.label}</Chip>
            ))}
          </div>
        </Section>

        <Section label="Thickness (mm)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {config.thicknesses.map(t => (
              <Chip key={t} active={form.thickness === t} onClick={() => set('thickness')(t)}>{t} mm</Chip>
            ))}
          </div>
        </Section>

        <Section label={`Quantity: ${form.quantity} part${form.quantity > 1 ? 's' : ''}`}>
          <input type="range" min="1" max="100" step="1" value={form.quantity}
            onChange={e => set('quantity')(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#22d3a5' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginTop: 3 }}>
            <span>1</span><span>10+ → 5% off &nbsp; 20+ → 10% &nbsp; 50+ → 15%</span><span>100</span>
          </div>
        </Section>

        {error && (
          <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {/* Price breakdown */}
        <div style={{ background: '#0f1117', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
          {calculating ? (
            <div style={{ fontSize: 13, color: '#475569', textAlign: 'center', padding: '8px 0' }}>Calculating...</div>
          ) : pricing ? (
            <>
              {/* Cost lines */}
              {[
                ['Material', `€${pricing.unit_material_cost}`],
                ['Cutting', `€${pricing.unit_cutting_cost}`],
                ['Setup', `€${pricing.setup_fee}`],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#64748b' }}>
                  <span>{l}</span><span style={{ color: '#94a3b8' }}>{v}</span>
                </div>
              ))}

              <div style={{ borderTop: '1px solid #1e293b', margin: '6px 0' }} />

              {/* Subtotal ex VAT per unit */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#64748b' }}>
                <span>Unit price (ex. VAT)</span>
                <span style={{ color: '#e2e8f0' }}>€{pricing.unit_price}</span>
              </div>

              {/* Quantity */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#64748b' }}>
                <span>× {form.quantity} {form.quantity > 1 ? 'parts' : 'part'}</span>
                <span style={{ color: '#e2e8f0' }}>€{pricing.total_ex_vat}</span>
              </div>

              {/* Discount */}
              {pricing.quantity_discount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#22d3a5' }}>
                  <span>Quantity discount</span><span>−{pricing.quantity_discount}</span>
                </div>
              )}

              {/* VAT */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#64748b' }}>
                <span>VAT ({pricing.vat_rate})</span>
                <span style={{ color: '#94a3b8' }}>€{pricing.vat_amount}</span>
              </div>

              <div style={{ borderTop: '1px solid #1e293b', margin: '6px 0' }} />

              {/* Total inc VAT */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, padding: '4px 0', color: '#f8fafc' }}>
                <span>Total inc. VAT</span>
                <span style={{ color: '#22d3a5' }}>€{pricing.total_price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11, color: '#475569', marginTop: 2 }}>
                €{pricing.total_ex_vat} ex. VAT
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: '#475569', textAlign: 'center', padding: '8px 0' }}>
              Upload a file to see pricing
            </div>
          )}
        </div>

        <button onClick={saveQuote} disabled={!pricing || saving || !file || saved} style={{
          width: '100%', padding: '11px', borderRadius: 8, border: 'none',
          fontSize: 14, fontWeight: 600,
          cursor: pricing && !saved ? 'pointer' : 'not-allowed',
          background: saved ? '#14532d' : (pricing ? '#22d3a5' : '#1e293b'),
          color: saved ? '#4ade80' : (pricing ? '#0f1117' : '#475569'),
          transition: 'all 0.15s',
        }}>
          {saved ? '✓ Quote saved' : saving ? 'Saving...' : 'Save quote'}
        </button>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 99,
      border: `1px solid ${active ? '#22d3a5' : '#1e293b'}`,
      background: active ? 'rgba(34,211,165,0.12)' : '#0f1117',
      color: active ? '#22d3a5' : '#64748b',
      fontSize: 12, cursor: 'pointer',
    }}>{children}</button>
  );
}
