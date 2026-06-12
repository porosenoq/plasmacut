import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { PrefsProvider } from './lib/prefs.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import QuotesPage from './pages/QuotesPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import MarketplacePage from './pages/MarketplacePage.jsx';
import ProviderApplyPage from './pages/ProviderApplyPage.jsx';
import ProviderDashboardPage from './pages/ProviderDashboardPage.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <PrefsProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Protected><Layout /></Protected>}>
              <Route index element={<UploadPage />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="marketplace" element={<MarketplacePage />} />
              <Route path="provider-apply" element={<ProviderApplyPage />} />
              <Route path="provider-dashboard" element={<ProviderDashboardPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </PrefsProvider>
  );
}
