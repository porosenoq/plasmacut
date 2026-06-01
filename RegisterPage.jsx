import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePrefs } from '../lib/prefs.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const { colors } = usePrefs();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await register(form.email, form.password, form.name); navigate('/'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 380, background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>&#9889;</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: colors.text }}>Create account</h1>
          <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Start getting instant quotes</p>
        </div>
        {error && <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>{error}</div>}
        <form onSubmit={submit}>
          {[['Full name', 'name', 'text'], ['Email', 'email', 'email'], ['Password', 'password', 'password']].map(([l, k, type]) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: colors.textSecondary, display: 'block', marginBottom: 5 }}>{l}</label>
              <input type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required
                style={{ width: '100%', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '9px 12px', fontSize: 14, color: colors.text, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: colors.accent, color: colors.bg === '#f1f5f9' ? '#fff' : '#0f1117', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 6 }}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 13, color: colors.textMuted, marginTop: 20 }}>
          Have an account? <Link to="/login" style={{ color: colors.accent, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
