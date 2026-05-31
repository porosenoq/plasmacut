import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const STATUS_STEPS = ['pending', 'confirmed', 'in_production', 'shipped', 'delivered'];
const STATUS_LABELS = { pending:'Pending', confirmed:'Confirmed', in_production:'In production', shipped:'Shipped', delivered:'Delivered', cancelled:'Cancelled' };
const STATUS_COLORS = { pending:'#f59e0b', confirmed:'#3b82f6', in_production:'#8b5cf6', shipped:'#06b6d4', delivered:'#22d3a5', cancelled:'#ef4444' };

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getOrders().then(setOrders).finally(() => setLoading(false)); }, []);

  if (loading) return <div style={{ color: '#475569', padding: 32 }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#f8fafc', marginBottom: 4 }}>My orders</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#475569' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <p style={{ fontSize: 15 }}>No orders yet</p>
          <a href="/" style={{ fontSize: 13, color: '#22d3a5', textDecoration: 'none', display: 'inline-block', marginTop: 8 }}>
            Upload a DXF to get started →
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {orders.map(order => {
            const subtotal = Number(order.subtotal || 0);
            const vat = subtotal * 0.20;
            const total = subtotal + vat;
            const addr = order.delivery_address || {};
            return (
              <div key={order.id} style={{ background: '#151a25', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                        Order #{order.id.slice(0,8).toUpperCase()}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: `1px solid ${STATUS_COLORS[order.status] || '#475569'}`, color: STATUS_COLORS[order.status] || '#475569' }}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>

                    {/* Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                      {(order.items || []).map((item, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>📐 {item.original_name}</span>
                          <span style={{ color: '#64748b' }}>{item.cutting_method} · {item.material?.replace('_',' ')} · {item.thickness_mm}mm · ×{item.quantity}</span>
                          <span style={{ color: '#22d3a5' }}>€{Number(item.total_price).toFixed(2)} ex. VAT</span>
                        </div>
                      ))}
                    </div>

                    {/* Delivery */}
                    {addr.street && (
                      <div style={{ fontSize: 11, color: '#475569' }}>
                        📍 {addr.street}, {addr.city} {addr.postal_code}, {addr.country}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                      Placed {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#22d3a5' }}>€{total.toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>inc. VAT</div>
                    <a href={api.getPdfUrl(order.id)} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, padding: '6px 14px', background: 'transparent', color: '#64748b', border: '1px solid #1e293b', borderRadius: 6, textDecoration: 'none', display: 'inline-block' }}>
                      ↓ PDF
                    </a>
                  </div>
                </div>

                {/* Progress tracker */}
                {order.status !== 'cancelled' && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #1e293b', background: '#0f1117' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {STATUS_STEPS.map((step, i) => {
                        const currentIdx = STATUS_STEPS.indexOf(order.status);
                        const done = i <= currentIdx;
                        const active = i === currentIdx;
                        return (
                          <React.Fragment key={step}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 'none' }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: '50%',
                                border: `2px solid ${done ? '#22d3a5' : '#1e293b'}`,
                                background: active ? '#22d3a5' : done ? 'rgba(34,211,165,0.2)' : '#0f1117',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
                                boxShadow: active ? '0 0 8px rgba(34,211,165,0.5)' : 'none',
                              }}>
                                {done && !active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3a5' }} />}
                              </div>
                              <span style={{ fontSize: 10, color: done ? '#22d3a5' : '#334155', whiteSpace: 'nowrap' }}>
                                {STATUS_LABELS[step]}
                              </span>
                            </div>
                            {i < STATUS_STEPS.length - 1 && (
                              <div style={{ flex: 1, height: 2, background: i < STATUS_STEPS.indexOf(order.status) ? '#22d3a5' : '#1e293b', marginBottom: 16, marginTop: 1 }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
