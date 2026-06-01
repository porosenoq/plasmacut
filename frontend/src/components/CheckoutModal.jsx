import React, { useState } from 'react';
import { api } from '../lib/api.js';

export default function CheckoutModal({ files, method, totalExVat, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '', street: '', city: '', postal_code: '', country: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const vat = totalExVat * 0.20;
  const total = totalExVat + vat;
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      // Save all quotes first, then create order
      const savedQuotes = await Promise.all(
        files.map(f => api.saveQuote({
          file_id: f.file.id,
          cutting_method: method,
          material: f.form.material,
          thickness_mm: f.form.thickness,
          quantity: f.form.quantity,
        }))
      );

      const quoteIds = savedQuotes.map(r => r.quote.id);

      const result = await api.createOrder({
        quote_ids: quoteIds,
        delivery_address: {
          name: form.name,
          street: form.street,
          city: form.city,
          postal_code: form.postal_code,
          country: form.country,
        },
        notes: form.notes || undefined,
      });

      onSuccess(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#151a25', border: '1px solid #1e293b', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #1e293b' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#f8fafc', margin: 0 }}>Place order</h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>{files.length} part{files.length > 1 ? 's' : ''} · confirm delivery details</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Order summary */}
        <div style={{ padding: '14px 22px', borderBottom: '1px solid #1e293b', background: '#0f1117' }}>
          {files.map(f => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#64748b' }}>
              <span style={{ color: '#94a3b8' }}>
                {f.file?.original_name}
                <span style={{ fontSize: 11, marginLeft: 6 }}>× {f.form.quantity}</span>
                <span style={{ fontSize: 11, marginLeft: 6, color: '#475569' }}>
                  {f.form.material?.replace('_',' ')} · {f.form.thickness}mm
                </span>
              </span>
              <span>€{f.pricing?.total_ex_vat}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #1e293b', marginTop: 8, paddingTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 3 }}>
              <span>Subtotal ex. VAT</span><span>€{totalExVat.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              <span>VAT (20%)</span><span>€{vat.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#22d3a5' }}>
              <span>Total inc. VAT</span><span>€{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Delivery address</div>

          {error && (
            <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#fca5a5' }}>{error}</div>
          )}

          <Field label="Full name" value={form.name} onChange={set('name')} required />
          <Field label="Street address" value={form.street} onChange={set('street')} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="City" value={form.city} onChange={set('city')} required />
            <Field label="Postal code" value={form.postal_code} onChange={set('postal_code')} required />
          </div>
          <Field label="Country" value={form.country} onChange={set('country')} required />
          <Field label="Notes (optional)" value={form.notes} onChange={set('notes')} multiline />

          <div style={{ fontSize: 12, color: '#475569', marginBottom: 16, lineHeight: 1.5 }}>
            By placing this order you agree to our terms. Payment is due upon delivery confirmation. We'll email you with a production timeline within 24 hours.
          </div>

          <button type="submit" disabled={submitting} style={{
            width: '100%', padding: '12px',
            background: submitting ? '#1e293b' : '#22d3a5',
            color: submitting ? '#475569' : '#0f1117',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}>
            {submitting ? 'Placing order...' : `Place order — €${total.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, multiline }) {
  const style = {
    width: '100%', background: '#0f1117', border: '1px solid #1e293b',
    borderRadius: 6, padding: '8px 11px', fontSize: 13, color: '#f8fafc',
    outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box',
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>{label}</label>
      {multiline
        ? <textarea value={value} onChange={onChange} rows={2} style={style} />
        : <input type="text" value={value} onChange={onChange} required={required} style={style} />
      }
    </div>
  );
}
