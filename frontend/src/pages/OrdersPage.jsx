import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const STATUS_STEPS = ['pending', 'confirmed', 'in_production', 'shipped', 'delivered'];
const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_production: 'In production',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  in_production: '#8b5cf6',
  shipped: '#06b6d4',
  delivered: '#22d3a5',
  cancelled: '#ef4444',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: '#475569', padding: 32 }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#f8fafc', marginBottom: 4 }}>Orders</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#475569' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <p style={{ fontSize: 15 }}>No orders yet</p>
          <a href="/quotes" style={{ fontSize: 13, color: '#22d3a5', textDecoration: 'none', display: 'inline-block', marginTop: 8 }}>
            Go to quotes to place an order →
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(order => (
            <div key={order.id} style={{ background: '#151a25', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>{order.original_name}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: `1px solid ${STATUS_COLORS[order.status] || '#475569'}`, color: STATUS_COLORS[order.status] || '#475569' }}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {[
                      ['Order', `#${order.id.slice(0, 8)}`],
                      ['Method', order.cutting_method],
                      ['Material', order.material?.replace('_', ' ')],
                      ['Qty', `${order.quantity} parts`],
                      ['Placed', new Date(order.created_at).toLocaleDateString()],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 10, color: '#475569' }}>{l}</div>
                        <div style={{ fontSize: 13, color: '#94a3b8', textTransform: 'capitalize' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#22d3a5' }}>
                    €{(+order.total_price).toFixed(2)}
                  </div>
                </div>
              </div>

              {order.status !== 'cancelled' && (
                <div style={{ padding: '12px 18px', borderTop: '1px solid #1e293b', background: '#0f1117' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    {STATUS_STEPS.map((step, i) => {
                      const currentIdx = STATUS_STEPS.indexOf(order.status);
                      const done = i <= currentIdx;
                      const active = i === currentIdx;
                      return (
                        <React.Fragment key={step}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 'none' }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%', border: `2px solid ${done ? '#22d3a5' : '#1e293b'}`,
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
          ))}
        </div>
      )}
    </div>
  );
}
