import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { usePrefs } from '../lib/prefs.jsx';

export default function ProviderApplyPage() {
  const { colors } = usePrefs();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    equipment: '', max_thickness_mm: '', cutting_methods: [], location: '', notes: '',
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.getProviderStatus().then(setStatus).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggleMethod = (m) => setForm(f => ({
    ...f,
    cutting_methods: f.cutting_methods.includes(m) ? f.cutting_methods.filter(x => x !== m) : [...f.cutting_methods, m],
  }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await api.applyAsProvider({
        ...form,
        max_thickness_mm: form.max_thickness_mm ? Number(form.max_thickness_mm) : null,
      });
      setSuccess(true);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const inputStyle = { width: '100%', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '8px 11px', fontSize: 13, color: colors.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none' };
  const labelStyle = { fontSize: 12, color: colors.textMuted, display: 'block', marginBottom: 5 };

  if (loading) return <div style={{ color: colors.textMuted, padding: 32 }}>Loading...</div>;

  if (status?.is_provider) {
    return (
      <div style={{ maxWidth: 480, textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>&#9989;</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: colors.text, marginBottom: 8 }}>You're already an approved provider</h1>
        <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: 20 }}>Head to the marketplace to start claiming jobs.</p>
        <a href="/marketplace" style={{ fontSize: 13, color: colors.bg === '#f1f5f9' ? '#fff' : '#0f1117', textDecoration: 'none', background: colors.accent, padding: '10px 22px', borderRadius: 8, fontWeight: 600 }}>Go to marketplace &rarr;</a>
      </div>
    );
  }

  if (success || status?.application?.status === 'pending') {
    return (
      <div style={{ maxWidth: 480, textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>&#9203;</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: colors.text, marginBottom: 8 }}>Application submitted</h1>
        <p style={{ fontSize: 14, color: colors.textMuted }}>An admin will review your application. You'll be able to claim jobs from the marketplace once approved.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: colors.text, marginBottom: 4 }}>Become a provider</h1>
        <p style={{ fontSize: 14, color: colors.textMuted }}>Tell us about your equipment so we can match you with suitable jobs.</p>
      </div>

      <form onSubmit={submit}>
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '20px 24px' }}>
          {error && <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#fca5a5' }}>{error}</div>}

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Equipment description</label>
            <textarea value={form.equipment} onChange={set('equipment')} rows={2} placeholder="e.g. Fiber laser cutter, 3kW, 1500x3000mm bed" style={inputStyle} required />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Cutting methods</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['laser', '\uD83D\uDD25 Laser'], ['plasma', '\u26A1 Plasma']].map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => toggleMethod(val)} style={{
                  flex: 1, padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${form.cutting_methods.includes(val) ? colors.accent : colors.border}`,
                  background: form.cutting_methods.includes(val) ? colors.accentBg : colors.inputBg,
                  color: form.cutting_methods.includes(val) ? colors.accent : colors.textMuted,
                  fontSize: 13, fontWeight: form.cutting_methods.includes(val) ? 600 : 400,
                }}>{lbl}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Max material thickness (mm)</label>
            <input type="number" value={form.max_thickness_mm} onChange={set('max_thickness_mm')} placeholder="20" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Location (city, country)</label>
            <input type="text" value={form.location} onChange={set('location')} placeholder="Sofia, Bulgaria" required style={inputStyle} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Additional notes (optional)</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Years of experience, certifications, portfolio link, etc." style={inputStyle} />
          </div>

          <button type="submit" disabled={submitting || form.cutting_methods.length === 0} style={{
            width: '100%', padding: '11px', borderRadius: 8, border: 'none',
            background: form.cutting_methods.length === 0 ? colors.bgTertiary : colors.accent,
            color: form.cutting_methods.length === 0 ? colors.textFaint : (colors.bg === '#f1f5f9' ? '#fff' : '#0f1117'),
            fontSize: 14, fontWeight: 600, cursor: form.cutting_methods.length === 0 ? 'not-allowed' : 'pointer',
          }}>
            {submitting ? 'Submitting...' : 'Submit application'}
          </button>
          {form.cutting_methods.length === 0 && (
            <p style={{ fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: 8 }}>Select at least one cutting method</p>
          )}
        </div>
      </form>
    </div>
  );
}
