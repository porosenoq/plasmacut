import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import DxfPreview from './DxfPreview.jsx';

const MATERIALS = {
  mild_steel:      'Mild steel',
  stainless_steel: 'Stainless steel',
  aluminium:       'Aluminium',
  brass:           'Brass',
  acrylic:         'Acrylic',
};
const THICKNESSES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

export default function FileQuoteRow({ entry, method, onPricing, onFormChange, onRemove, onQuoteSaved }) {
  const [expanded, setExpanded] = useState(true);
  const [form, setForm] = useState(entry.form);
  const [pricing, setPricing] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Recalculate when form, method, or file changes
  useEffect(() => {
    if (!entry.file?.cut_length_mm) return;
    setError('');
    setCalculating(true);
    const t = setTimeout(() => {
      api.calculateQuote({
        file_id: entry.file.id,
        cutting_method: method,
        material: form.material,
        thickness_mm: form.thickness,
        quantity: form.quantity,
      })
        .then(p => {
          setPricing(p);
          onPricing(p);
          setCalculating(false);
        })
        .catch(e => {
          setError(e.message);
          setCalculating(false);
        });
    }, 350);
    return () => clearTimeout(t);
  }, [form, method, entry.file]);

  const set = (k) => (v) => {
    const newForm = { ...form, [k]: v };
    setForm(newForm);
    onFormChange(newForm);
    setSaved(false);
  };

  const saveQuote = async () => {
    setSaving(true);
    try {
      const q = await api.saveQuote({
        file_id: entry.file.id,
        cutting_method: method,
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
    <div style={{ background: '#151a25', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', borderBottom: expanded ? '1px solid #1e293b' : 'none' }}
        onClick={() => !entry.loading && setExpanded(e => !e)}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>
          {entry.loading ? '⏳' : entry.error ? '❌' : '📐'}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', flex: 1 }}>{entry.name}</span>

        {entry.loading && (
          <span style={{ fontSize: 12, color: '#64748b' }}>Uploading & parsing...</span>
        )}
        {!entry.loading && !entry.error && pricing && (
          <span style={{ fontSize: 14, fontWeight: 600, color: '#22d3a5', marginRight: 8 }}>
            {calculating ? '...' : `€${pricing.total_ex_vat} ex. VAT`}
          </span>
        )}
        {!entry.loading && (
          <>
            <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
            <span style={{ color: '#475569', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
          </>
        )}
      </div>

      {/* Loading bar */}
      {entry.loading && (
        <div style={{ height: 3, background: '#1e293b', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '40%', background: '#22d3a5', borderRadius: 99, animation: 'slide 1.2s infinite ease-in-out' }} />
          <style>{`@keyframes slide{0%{margin-left:-40%}100%{margin-left:100%}}`}</style>
        </div>
      )}

      {/* Error */}
      {entry.error && (
        <div style={{ padding: '10px 16px', fontSize: 13, color: '#fca5a5' }}>
          Failed to parse: {entry.error}
        </div>
      )}

      {/* Expanded content */}
      {expanded && !entry.loading && !entry.error && entry.file && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {/* Left: preview */}
          <div style={{ borderRight: '1px solid #1e293b' }}>
            <DxfPreview file={entry.file} svgContent={entry.svgContent} compact />
          </div>

          {/* Right: configurator */}
          <div style={{ padding: 16 }}>
            <Section label="Material">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {Object.entries(MATERIALS).map(([key, label]) => (
                  <Chip key={key} active={form.material === key} onClick={() => set('material')(key)}>{label}</Chip>
                ))}
              </div>
            </Section>

            <Section label="Thickness (mm)">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {THICKNESSES.map(t => (
                  <Chip key={t} active={form.thickness === t} onClick={() => set('thickness')(t)}>{t}</Chip>
                ))}
              </div>
            </Section>

            <Section label={`Quantity: ${form.quantity}`}>
              <input type="range" min="1" max="100" step="1" value={form.quantity}
                onChange={e => set('quantity')(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#22d3a5' }} />
            </Section>

            {error && (
              <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 10, background: '#1a0a0a', padding: '6px 10px', borderRadius: 6 }}>{error}</div>
            )}

            {/* Price box */}
            <div style={{ background: '#0f1117', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
              {calculating ? (
                <div style={{ fontSize: 12, color: '#475569', textAlign: 'center' }}>Calculating...</div>
              ) : pricing ? (
                <>
                  {[
                    ['Material', `€${pricing.unit_material_cost}`],
                    ['Cutting', `€${pricing.unit_cutting_cost}`],
                    ['Setup', `€${pricing.setup_fee}`],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: '#475569' }}>
                      <span>{l}</span><span>{v}</span>
                    </div>
                  ))}
                  {pricing.quantity_discount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: '#22d3a5' }}>
                      <span>Qty discount</span><span>−{pricing.quantity_discount}</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #1e293b', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>
                    <span>× {form.quantity} — ex. VAT</span>
                    <span style={{ color: '#22d3a5' }}>€{pricing.total_ex_vat}</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: '#475569', textAlign: 'center' }}>—</div>
              )}
            </div>

            <button onClick={saveQuote} disabled={!pricing || saving || saved} style={{
              width: '100%', padding: '9px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600,
              cursor: pricing && !saved ? 'pointer' : 'not-allowed',
              background: saved ? '#14532d' : (pricing ? '#22d3a5' : '#1e293b'),
              color: saved ? '#4ade80' : (pricing ? '#0f1117' : '#475569'),
            }}>
              {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save quote'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
      border: `1px solid ${active ? '#22d3a5' : '#1e293b'}`,
      background: active ? 'rgba(34,211,165,0.12)' : '#0f1117',
      color: active ? '#22d3a5' : '#64748b',
    }}>{children}</button>
  );
}
