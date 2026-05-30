import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const s = {
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, borderBottom: '1px solid #1e293b', background: '#0a0d14', position: 'sticky', top: 0, zIndex: 100 },
  logo: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 17, color: '#f8fafc', textDecoration: 'none' },
  bolt: { color: '#22d3a5', fontSize: 20 },
  links: { display: 'flex', gap: 4 },
  right: { display: 'flex', alignItems: 'center', gap: 12 },
  userBadge: { fontSize: 13, color: '#64748b' },
  logoutBtn: { fontSize: 13, padding: '5px 12px', background: 'transparent', border: '1px solid #1e293b', borderRadius: 6, color: '#94a3b8', cursor: 'pointer' },
};

function NavItem({ to, children }) {
  return (
    <NavLink to={to} end={to === '/'} style={({ isActive }) => ({
      padding: '6px 12px', borderRadius: 6, fontSize: 14, textDecoration: 'none',
      color: isActive ? '#f8fafc' : '#64748b',
      background: isActive ? '#1e293b' : 'transparent',
    })}>
      {children}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117' }}>
      <nav style={s.nav}>
        <NavLink to="/" style={s.logo}>
          <span style={s.bolt}>⚡</span> CutQuote
        </NavLink>
        <div style={s.links}>
          <NavItem to="/">New quote</NavItem>
          <NavItem to="/quotes">My quotes</NavItem>
          <NavItem to="/orders">Orders</NavItem>
        </div>
        <div style={s.right}>
          <span style={s.userBadge}>{user?.email}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </nav>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <Outlet />
      </main>
    </div>
  );
}
