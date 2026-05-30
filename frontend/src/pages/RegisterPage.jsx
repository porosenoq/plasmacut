import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await register(form.email, form.password, form.name); navigate('/'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 380, background: '#151a25', border: '1px solid #1e293b', borderRadius: 12, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#f8fafc' }}>Create account</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Start getting instant quotes</p>
        </div>
        {error && <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>{error}</div>}
        <form onSubmit={submit}>
          <Field label="Full name" type="text" value={form.name} onChange={set('name')} />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} />
          <Field label="Password" type="password" value={form.password} onChange={set('password')} />
          <button type="submit" disabled={loading} style={btnStyle}>{loading ? 'Creating account...' : 'Create account'}</button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 20 }}>
          Have an account? <Link to="/login" style={{ color: '#22d3a5', textDecoration: 'none' }}>Sign in</Link>
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
