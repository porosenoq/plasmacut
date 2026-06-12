import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePrefs } from '../lib/prefs.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, colors } = usePrefs();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, transition: 'background 0.2s, color 0.2s' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, borderBottom: `1px solid ${colors.border}`, background: colors.navBg, position: 'sticky', top: 0, zIndex: 100 }}>
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 17, color: colors.text, textDecoration: 'none' }}>
          <span style={{ color: colors.accent }}>&#9889;</span> CutQuote
        </NavLink>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            ['/', t('newQuote')],
            ['/quotes', t('quotes')],
            ['/orders', t('orders')],
            ['/marketplace', 'Marketplace'],
            ...(user?.is_provider ? [['/provider-dashboard', 'My Jobs']] : []),
            ...(user?.is_admin ? [['/admin', t('admin')]] : []),
          ].map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
              padding: '6px 12px', borderRadius: 6, fontSize: 14, textDecoration: 'none',
              color: isActive ? colors.text : colors.textMuted,
              background: isActive ? colors.bgTertiary : 'transparent',
            })}>
              {label}
            </NavLink>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NavLink to="/profile" style={({ isActive }) => ({
            fontSize: 13, padding: '5px 12px', borderRadius: 6, textDecoration: 'none',
            color: isActive ? colors.accent : colors.textMuted,
            background: isActive ? colors.accentBg : 'transparent',
            border: `1px solid ${isActive ? colors.accent : colors.border}`,
          })}>
            {user?.name?.split(' ')[0] || t('profile')}
          </NavLink>
          <button onClick={handleLogout} style={{ fontSize: 13, padding: '5px 12px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.textMuted, cursor: 'pointer' }}>
            {t('signOut')}
          </button>
        </div>
      </nav>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <Outlet />
      </main>
    </div>
  );
}
