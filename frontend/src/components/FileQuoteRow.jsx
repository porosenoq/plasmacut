import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { usePrefs } from '../lib/prefs.jsx';
import DxfPreview from './DxfPreview.jsx';

const MATERIALS = {
  mild_steel: 'Mild steel', stainless_steel: 'Stainless steel',
  aluminium: 'Aluminium', brass: 'Brass', acrylic: 'Acrylic',
};
const THICKNESSES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

export default function FileQuoteRow({ entry, method, onPricing, onFormChange, onRemove }) {
  const { t, colors } = usePrefs();
  const [expanded, setExpanded] = useState(true);
  const [form, setForm] = useState(entry.form);
  const [pricing, setPricing] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!entry.file?.cut_length_mm) return;
    setError(''); setCalculating(true);
    const t2 = setTimeout(() => {
      api.calculateQuote({ file_id: entry.file.id, cutting_method: method, material: form.material, thickness_mm: form.thickness, quantity: form.quantity })
        .then(p => { setPricing(p); onPricing(p); setCalculating(false); })
        .catch(e => { setError(e.message); setCalculating(false); });
    }, 350);
    return () => clearTimeout(t2);
  }, [form, method, entry.file]);

  const set = (k) => (v) => { const nf = { ...form, [k]: v }; setForm(nf); onFormChange(nf); };

  return (
    <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', borderBottom: expanded ? `1px solid ${colors.border}` : 'none' }}
        onClick={() => !entry.loading && setExpanded(e => !e)}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{entry.loading ? '\u23F3' : entry.error ? '\u274C' : '\u{1F4D0}'}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: colors.text, flex: 1 }}>{entry.name}</span>
        {entry.loading && <span style={{ fontSize: 12, color: colors.textMuted }}>{t('uploadingParsing')}</span>}
        {!entry.loading && !entry.error && pricing && (
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.accent, marginRight: 8 }}>
            {calculating ? '...' : `\u20AC${pricing.total_ex_vat} ${t('exVat')}`}
          </span>
        )}
        {!entry.loading && (
          <>
            <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{ background: 'none', border: 'none', color: colors.textFaint, cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>{'\u00D7'}</button>
            <span style={{ color: colors.textFaint, fontSize: 12 }}>{expanded ? '\u25B2' : '\u25BC'}</span>
          </>
        )}
      </div>

      {entry.loading && (
        <div style={{ height: 3, background: colors.bgTertiary, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '40%', background: colors.accent, borderRadius: 99, animation: 'slide 1.2s infinite ease-in-out' }} />
          <style>{`@keyframes slide{0%{margin-left:-40%}100%{margin-left:100%}}`}</style>
        </div>
      )}
      {entry.error && <div style={{ padding: '10px 16px', fontSize: 13, color: '#fca5a5' }}>{t('failedParse')}: {entry.error}</div>}

      {expanded && !entry.loading && !entry.error && entry.file && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <div style={{ borderRight: `1px solid ${colors.border}` }}>
            <DxfPreview file={entry.file} svgContent={entry.svgContent} compact />
          </div>
          <div style={{ padding: 16 }}>
            <Section label={t('material')} colors={colors}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {Object.entries(MATERIALS).map(([key, label]) => (
                  <Chip key={key} active={form.material === key} onClick={() => set('material')(key)} colors={colors}>{label}</Chip>
                ))}
              </div>
            </Section>
            <Section label={t('thickness')} colors={colors}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {THICKNESSES.map(th => (
                  <Chip key={th} active={form.thickness === th} onClick={() => set('thickness')(th)} colors={colors}>{th}</Chip>
                ))}
              </div>
            </Section>
            <Section label={`${t('quantity')}: ${form.quantity}`} colors={colors}>
              <input type="range" min="1" max="100" step="1" value={form.quantity}
                onChange={e => set('quantity')(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.accent }} />
            </Section>
            {error && <div style={{ fontSize: 12, color: '#fca5a5', background: '#1a0a0a', padding: '6px 10px', borderRadius: 6 }}>{error}</div>}
            <div style={{ background: colors.bg, borderRadius: 8, padding: '10px 12px' }}>
              {calculating ? (
                <div style={{ fontSize: 12, color: colors.textFaint, textAlign: 'center' }}>...</div>
              ) : pricing ? (
                <>
                  {[[t('material'), `\u20AC${pricing.unit_material_cost}`], [t('cutting'), `\u20AC${pricing.unit_cutting_cost}`], [t('setup'), `\u20AC${pricing.setup_fee}`]].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: colors.textFaint }}><span>{l}</span><span>{v}</span></div>
                  ))}
                  {pricing.quantity_discount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: colors.accent }}>
                      <span>{t('qtyDiscount')}</span><span>-{pricing.quantity_discount}</span>
                    </div>
                  )}
                  <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: colors.text }}>
                    <span>{'\u00D7'} {form.quantity} {'\u2014'} {t('exVat')}</span>
                    <span style={{ color: colors.accent }}>{'\u20AC'}{pricing.total_ex_vat}</span>
                  </div>
                </>
              ) : <div style={{ fontSize: 12, color: colors.textFaint, textAlign: 'center' }}>-</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children, colors }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children, colors }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
      border: `1px solid ${active ? colors.accent : colors.border}`,
      background: active ? colors.accentBg : colors.inputBg,
      color: active ? colors.accent : colors.textMuted,
    }}>{children}</button>
  );
}
