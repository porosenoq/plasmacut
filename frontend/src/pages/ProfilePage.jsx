import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePrefs } from '../lib/prefs.jsx';
import { api } from '../lib/api.js';

export default function ProfilePage() {
  const { user } = useAuth();
  const { theme, setTheme, lang, setLang, t, colors } = usePrefs();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('new') === '1';

  const [form, setForm] = useState({
    full_name: '', phone: '', street: '', city: '', postal_code: '', country: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getProfile()
      .then(p => { if (p) setForm({ full_name: p.full_name || '', phone: p.phone || '', street: p.street || '', city: p.city || '', postal_code: p.postal_code || '', country: p.country || '' }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      await api.saveProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const card = { background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 };
  const label = { fontSize: 12, color: colors.textMuted, display: 'block', marginBottom: 5 };
  const inputStyle = { width: '100%', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '8px 11px', fontSize: 13, color: colors.text, outline: 'none', boxSizing: 'border-box' };

  if (loading) return <div style={{ color: colors.textMuted, padding: 32 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: colors.text, marginBottom: 4 }}>{t('profileTitle')}</h1>
        {isNew && (
          <div style={{ background: 'rgba(34,211,165,0.1)', border: `1px solid ${colors.accent}`, borderRadius: 8, padding: '10px 14px', marginTop: 10 }}>
            <p style={{ fontSize: 13, color: colors.accent, margin: 0 }}>
              Welcome! Please fill in your details below — they will be auto-filled when you place orders.
            </p>
          </div>
        )}
      </div>

      {/* Account info */}
      <div style={card}>
        <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          {t('accountDetails')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[[t('name'), user?.name], [t('email'), user?.email],
            [t('memberSince'), user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'],
            ['Role', user?.is_admin ? 'Administrator' : 'Customer']
          ].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 11, color: colors.textFaint }}>{l}</div>
              <div style={{ fontSize: 13, color: colors.text, padding: '4px 0' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact & delivery details */}
      <form onSubmit={save}>
        <div style={card}>
          <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Contact & Delivery Details
          </div>
          <p style={{ fontSize: 12, color: colors.textFaint, marginBottom: 16, lineHeight: 1.5 }}>
            These details will be auto-filled when you place an order. You can always change them at checkout.
          </p>

          {error && <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#fca5a5' }}>{error}</div>}

          <div style={{ marginBottom: 14 }}>
            <label style={label}>Full name</label>
            <input type="text" value={form.full_name} onChange={set('full_name')} placeholder="Your full name" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label}>Phone number</label>
            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+359 888 123 456" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label}>Street address</label>
            <input type="text" value={form.street} onChange={set('street')} placeholder="Street and number" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label}>City</label>
              <input type="text" value={form.city} onChange={set('city')} placeholder="Sofia" style={inputStyle} />
            </div>
            <div>
              <label style={label}>Postal code</label>
              <input type="text" value={form.postal_code} onChange={set('postal_code')} placeholder="1000" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={label}>Country</label>
            <input type="text" value={form.country} onChange={set('country')} placeholder="Bulgaria" style={inputStyle} />
          </div>

          <button type="submit" disabled={saving} style={{
            width: '100%', padding: '10px', borderRadius: 8, border: 'none',
            background: saved ? '#14532d' : colors.accent,
            color: saved ? '#4ade80' : (colors.bg === '#f1f5f9' ? '#fff' : '#0f1117'),
            fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saved ? '\u2713 Details saved' : saving ? 'Saving...' : 'Save details'}
          </button>
        </div>
      </form>

      {/* Preferences */}
      <div style={card}>
        <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          {t('preferences')}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={label}>{t('theme')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['dark', t('darkTheme'), '\uD83C\uDF19'], ['light', t('lightTheme'), '\u2600\uFE0F']].map(([val, lbl, icon]) => (
              <button key={val} onClick={() => setTheme(val)} style={{
                flex: 1, padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${theme === val ? colors.accent : colors.border}`,
                background: theme === val ? colors.accentBg : colors.inputBg,
                color: theme === val ? colors.accent : colors.textMuted,
                fontSize: 13, fontWeight: theme === val ? 600 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {icon} {lbl}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={label}>{t('language')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['en', 'English', '\uD83C\uDDEC\uD83C\uDDE7'], ['bg', '\u0411\u044a\u043b\u0433\u0430\u0440\u0441\u043a\u0438', '\uD83C\uDDE7\uD83C\uDDEC']].map(([val, lbl, flag]) => (
              <button key={val} onClick={() => setLang(val)} style={{
                flex: 1, padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${lang === val ? colors.accent : colors.border}`,
                background: lang === val ? colors.accentBg : colors.inputBg,
                color: lang === val ? colors.accent : colors.textMuted,
                fontSize: 13, fontWeight: lang === val ? 600 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {flag} {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
