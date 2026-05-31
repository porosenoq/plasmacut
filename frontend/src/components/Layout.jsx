import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

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
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, borderBottom: '1px solid #1e293b', background: '#0a0d14', position: 'sticky', top: 0, zIndex: 100 }}>
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 17, color: '#f8fafc', textDecoration: 'none' }}>
          <span style={{ color: '#22d3a5' }}>⚡</span> CutQuote
        </NavLink>
        <div style={{ display: 'flex', gap: 4 }}>
          <NavItem to="/">New quote</NavItem>
          <NavItem to="/quotes">Quotes</NavItem>
          <NavItem to="/orders">Orders</NavItem>
          {user?.is_admin && <NavItem to="/admin">Admin</NavItem>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>{user?.email}</span>
          <button onClick={handleLogout} style={{ fontSize: 13, padding: '5px 12px', background: 'transparent', border: '1px solid #1e293b', borderRadius: 6, color: '#94a3b8', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </nav>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <Outlet />
      </main>
    </div>
  );
}
