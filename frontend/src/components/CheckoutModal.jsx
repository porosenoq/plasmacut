import React, { useState } from 'react';
import { api } from '../lib/api.js';
import { usePrefs } from '../lib/prefs.jsx';

export default function CheckoutModal({ files, method, totalExVat, onClose, onSuccess }) {
  const { t, colors } = usePrefs();
  const [form, setForm] = useState({ name: '', street: '', city: '', postal_code: '', country: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const vat = totalExVat * 0.20;
  const total = totalExVat + vat;
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const savedQuotes = await Promise.all(
        files.map(f => api.saveQuote({ file_id: f.file.id, cutting_method: method, material: f.form.material, thickness_mm: f.form.thickness, quantity: f.form.quantity }))
      );
      const result = await api.createOrder({
        quote_ids: savedQuotes.map(r => r.quote.id),
        delivery_address: { name: form.name, street: form.street, city: form.city, postal_code: form.postal_code, country: form.country },
        notes: form.notes || undefined,
      });
      onSuccess(result);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const inputStyle = { width: '100%', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '8px 11px', fontSize: 13, color: colors.text, outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${colors.border}` }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: colors.text, margin: 0 }}>{t('placeOrder')}</h2>
            <p style={{ fontSize: 12, color: colors.textMuted, margin: '3px 0 0' }}>{files.length} {files.length > 1 ? t('parts') : t('part')} &middot; {t('confirmDelivery')}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>{'\u00D7'}</button>
        </div>

        <div style={{ padding: '14px 22px', borderBottom: `1px solid ${colors.border}`, background: colors.bg }}>
          {files.map(f => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: colors.textMuted }}>
              <span style={{ color: colors.textSecondary }}>{f.file?.original_name} <span style={{ fontSize: 11 }}>{'\u00D7'} {f.form.quantity}</span> <span style={{ fontSize: 11, color: colors.textFaint }}>{f.form.material?.replace('_',' ')} &middot; {f.form.thickness}mm</span></span>
              <span>{'\u20AC'}{f.pricing?.total_ex_vat}</span>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 8, paddingTop: 8 }}>
            {[[t('subtotalExVat'), `\u20AC${totalExVat.toFixed(2)}`], [t('vat'), `\u20AC${vat.toFixed(2)}`]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.textMuted, marginBottom: 3 }}><span>{l}</span><span>{v}</span></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: colors.accent }}>
              <span>{t('totalIncVat')}</span><span>{'\u20AC'}{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={submit} style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>{t('deliveryAddress')}</div>
          {error && <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#fca5a5' }}>{error}</div>}
          {[[t('fullName'), 'name'], [t('streetAddress'), 'street']].map(([l, k]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: colors.textMuted, display: 'block', marginBottom: 5 }}>{l}</label>
              <input type="text" value={form[k]} onChange={set(k)} required style={inputStyle} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[[t('city'), 'city'], [t('postalCode'), 'postal_code']].map(([l, k]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: colors.textMuted, display: 'block', marginBottom: 5 }}>{l}</label>
                <input type="text" value={form[k]} onChange={set(k)} required style={inputStyle} />
              </div>
            ))}
          </div>
          {[[t('country'), 'country', false], [t('notes'), 'notes', true]].map(([l, k, multi]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: colors.textMuted, display: 'block', marginBottom: 5 }}>{l}</label>
              {multi ? <textarea value={form[k]} onChange={set(k)} rows={2} style={inputStyle} /> : <input type="text" value={form[k]} onChange={set(k)} required style={inputStyle} />}
            </div>
          ))}
          <div style={{ fontSize: 12, color: colors.textFaint, marginBottom: 16, lineHeight: 1.5 }}>{t('termsNote')}</div>
          <button type="submit" disabled={submitting} style={{ width: '100%', padding: '12px', background: submitting ? colors.bgTertiary : colors.accent, color: submitting ? colors.textFaint : (colors.bg === '#f1f5f9' ? '#fff' : '#0f1117'), border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? t('placing') : `${t('placeOrder')} \u2014 \u20AC${total.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
