import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePrefs } from '../lib/prefs.jsx';

export default function ProfilePage() {
  const { user } = useAuth();
  const { theme, setTheme, lang, setLang, t, colors } = usePrefs();
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const card = { background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 };
  const label = { fontSize: 12, color: colors.textMuted, display: 'block', marginBottom: 5 };
  const value = { fontSize: 14, color: colors.text, padding: '8px 0' };

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: colors.text, marginBottom: 4 }}>{t('profileTitle')}</h1>
      </div>

      {/* Account details */}
      <div style={card}>
        <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
          {t('accountDetails')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            [t('name'), user?.name],
            [t('email'), user?.email],
            [t('memberSince'), user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'],
            ['Role', user?.is_admin ? 'Administrator' : 'Customer'],
          ].map(([l, v]) => (
            <div key={l}>
              <label style={label}>{l}</label>
              <div style={value}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div style={card}>
        <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
          {t('preferences')}
        </div>

        {/* Theme */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>{t('theme')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['dark', t('darkTheme'), '🌙'], ['light', t('lightTheme'), '☀️']].map(([val, lbl, icon]) => (
              <button key={val} onClick={() => setTheme(val)} style={{
                flex: 1, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${theme === val ? colors.accent : colors.border}`,
                background: theme === val ? colors.accentBg : colors.inputBg,
                color: theme === val ? colors.accent : colors.textMuted,
                fontSize: 13, fontWeight: theme === val ? 600 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <span>{icon}</span> {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>{t('language')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['en', 'English', '🇬🇧'], ['bg', '\u0411\u044a\u043b\u0433\u0430\u0440\u0441\u043a\u0438', '\u{1F1E7}\u{1F1EC}']].map(([val, lbl, flag]) => (
              <button key={val} onClick={() => setLang(val)} style={{
                flex: 1, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${lang === val ? colors.accent : colors.border}`,
                background: lang === val ? colors.accentBg : colors.inputBg,
                color: lang === val ? colors.accent : colors.textMuted,
                fontSize: 13, fontWeight: lang === val ? 600 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <span>{flag}</span> {lbl}
              </button>
            ))}
          </div>
        </div>

        <button onClick={save} style={{
          width: '100%', padding: '10px', borderRadius: 8, border: 'none',
          background: saved ? '#14532d' : colors.accent,
          color: saved ? '#4ade80' : (theme === 'dark' ? '#0f1117' : '#ffffff'),
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          {saved ? t('savedOk') + ' \u2713' : t('savePreferences')}
        </button>
      </div>
    </div>
  );
}
