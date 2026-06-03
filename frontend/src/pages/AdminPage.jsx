import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

async function downloadDxf(fileId, filename) {
  const token = localStorage.getItem('cq_token');
  const base = import.meta.env.VITE_API_URL || '/api';
  try {
    const res = await fetch(`${base}/files/${fileId}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Download failed');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Download failed: ' + e.message);
  }
}
import { useAuth } from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';

const STATUS_STEPS = ['pending', 'confirmed', 'in_production', 'shipped', 'delivered'];
const STATUS_LABELS = {
  pending: 'Pending', confirmed: 'Confirmed', in_production: 'In production',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
};
const STATUS_COLORS = {
  pending: '#f59e0b', confirmed: '#3b82f6', in_production: '#8b5cf6',
  shipped: '#06b6d4', delivered: '#22d3a5', cancelled: '#ef4444',
};
const NEXT_STATUS = {
  pending: 'confirmed', confirmed: 'in_production',
  in_production: 'shipped', shipped: 'delivered',
};

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user && !user.is_admin) { navigate('/'); return; }
    api.getAdminOrders().then(setOrders).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId);
    try {
      const updated = await api.updateOrderStatus(orderId, status);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: updated.status } : o));
    } catch (e) { alert(e.message); }
    finally { setUpdating(null); }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const counts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});

  if (loading) return <div style={{ color: '#475569', padding: 32 }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#f8fafc', marginBottom: 4 }}>Admin — Orders</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>{orders.length} total orders</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {STATUS_STEPS.map(s => (
          <div key={s} style={{ background: '#151a25', border: `1px solid ${filter === s ? STATUS_COLORS[s] : '#1e293b'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}
            onClick={() => setFilter(filter === s ? 'all' : s)}>
            <div style={{ fontSize: 20, fontWeight: 700, color: STATUS_COLORS[s] }}>{counts[s] || 0}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, textTransform: 'capitalize' }}>{STATUS_LABELS[s]}</div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>No orders in this status</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(order => {
            const subtotal = Number(order.subtotal || 0);
            const total = subtotal * 1.20;
            const addr = order.delivery_address || {};
            return (
              <div key={order.id} style={{ background: '#151a25', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                        #{order.id.slice(0,8).toUpperCase()}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: `1px solid ${STATUS_COLORS[order.status]}`, color: STATUS_COLORS[order.status] }}>
                        {STATUS_LABELS[order.status]}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {order.customer_name} · {order.customer_email}
                      </span>
                      <span style={{ fontSize: 11, color: '#475569' }}>
                        {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {(order.items || []).map((item, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span>📐 {item.original_name}</span>
                          <span style={{ color: '#64748b' }}>{item.cutting_method} · {item.material?.replace('_',' ')} · {item.thickness_mm}mm · ×{item.quantity}</span>
                          <span style={{ color: '#22d3a5' }}>€{Number(item.total_price).toFixed(2)}</span>
                          {item.file_id && (
                            <button
                              onClick={() => downloadDxf(item.file_id, item.original_name)}
                              style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(34,211,165,0.1)', color: '#22d3a5', border: '1px solid rgba(34,211,165,0.3)', borderRadius: 5, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              title="Download DXF file">
                              ↓ DXF
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Address */}
                    {addr.street && (
                      <div style={{ fontSize: 11, color: '#475569' }}>
                        📍 {addr.name} · {addr.street}, {addr.city} {addr.postal_code}, {addr.country}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#22d3a5' }}>€{total.toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>inc. VAT</div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {NEXT_STATUS[order.status] && (
                        <button
                          onClick={() => updateStatus(order.id, NEXT_STATUS[order.status])}
                          disabled={updating === order.id}
                          style={{ fontSize: 12, padding: '6px 12px', background: '#22d3a5', color: '#0f1117', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {updating === order.id ? '...' : `→ ${STATUS_LABELS[NEXT_STATUS[order.status]]}`}
                        </button>
                      )}
                      {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <button
                          onClick={() => { if (confirm('Cancel this order?')) updateStatus(order.id, 'cancelled'); }}
                          style={{ fontSize: 11, padding: '5px 10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef444440', borderRadius: 6, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      )}
                      <a href={api.getPdfUrl(order.id)}
                        style={{ fontSize: 11, padding: '5px 10px', background: 'transparent', color: '#64748b', border: '1px solid #1e293b', borderRadius: 6, cursor: 'pointer', textDecoration: 'none', textAlign: 'center' }}>
                        PDF
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
