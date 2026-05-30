import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await login(form.email, form.password); navigate('/'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 380, background: '#151a25', border: '1px solid #1e293b', borderRadius: 12, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#f8fafc' }}>CutQuote</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Sign in to your account</p>
        </div>
        {error && <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>{error}</div>}
        <form onSubmit={submit}>
          <Field label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
          <Field label="Password" type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} />
          <button type="submit" disabled={loading} style={btnStyle}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 20 }}>
          No account? <Link to="/register" style={{ color: '#22d3a5', textDecoration: 'none' }}>Register</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required
        style={{ width: '100%', background: '#0f1117', border: '1px solid #1e293b', borderRadius: 6, padding: '9px 12px', fontSize: 14, color: '#f8fafc', outline: 'none' }} />
    </div>
  );
}

const btnStyle = { width: '100%', padding: '10px', background: '#22d3a5', color: '#0f1117', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 6 };
