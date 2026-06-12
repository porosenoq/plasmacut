import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

async function downloadPdf(orderId) {
  const token = localStorage.getItem('cq_token');
  const base = import.meta.env.VITE_API_URL || '/api';
  try {
    const res = await fetch(`${base}/orders/${orderId}/pdf`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) { alert('PDF generation failed'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cutquote-${orderId.slice(0,8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) { alert('Download failed: ' + e.message); }
}
import { usePrefs } from '../lib/prefs.jsx';

const STATUS_STEPS = ['pending', 'confirmed', 'in_production', 'shipped', 'delivered'];
const STATUS_COLORS = { pending:'#f59e0b', confirmed:'#3b82f6', in_production:'#8b5cf6', shipped:'#06b6d4', delivered:'#22d3a5', cancelled:'#ef4444' };

export default function OrdersPage() {
  const { colors, t } = usePrefs();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getOrders().then(setOrders).finally(() => setLoading(false)); }, []);

  if (loading) return <div style={{ color: colors.textMuted, padding: 32 }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: colors.text, marginBottom: 4 }}>{t('ordersTitle')}</h1>
        <p style={{ fontSize: 14, color: colors.textMuted }}>{orders.length} {t('orders').toLowerCase()}</p>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: colors.textMuted }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <p style={{ fontSize: 15 }}>{t('noOrders')}</p>
          <a href="/quotes" style={{ fontSize: 13, color: colors.accent, textDecoration: 'none', display: 'inline-block', marginTop: 8 }}>{t('goToQuotes')}</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {orders.map(order => {
            const subtotal = Number(order.subtotal || 0);
            const vat = subtotal * 0.20;
            const total = subtotal + vat;
            const addr = order.delivery_address || {};
            return (
              <div key={order.id} style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>Order #{order.id.slice(0,8).toUpperCase()}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: `1px solid ${STATUS_COLORS[order.status] || colors.border}`, color: STATUS_COLORS[order.status] || colors.textMuted }}>
                        {t(order.status) || order.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                      {(order.items || []).map((item, i) => (
                        <div key={i} style={{ fontSize: 12, color: colors.textSecondary, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>📐 {item.original_name}</span>
                          <span style={{ color: colors.textMuted }}>{item.cutting_method} &middot; {item.material?.replace('_',' ')} &middot; {item.thickness_mm}mm &middot; {'\u00D7'}{item.quantity}</span>
                          <span style={{ color: colors.accent }}>{'\u20AC'}{Number(item.total_price).toFixed(2)} {t('exVat')}</span>
                          {item.total_weight_kg && <span style={{ color: colors.textFaint }}>{Number(item.total_weight_kg).toFixed(3)} kg</span>}
                        </div>
                      ))}
                    </div>
                    {addr.street && (
                      <div style={{ fontSize: 11, color: colors.textFaint }}>📍 {addr.street}, {addr.city} {addr.postal_code}, {addr.country}</div>
                    )}
                    <div style={{ fontSize: 11, color: colors.textFaint, marginTop: 4 }}>
                      {t('placed')} {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: colors.accent }}>{'\u20AC'}{total.toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: colors.textFaint }}>{t('incVat')}</div>
                    {(order.items||[]).reduce((s,i)=>s+Number(i.total_weight_kg||0),0) > 0 && (
                      <div style={{ fontSize: 11, color: colors.textFaint, marginBottom: 6, marginTop: 3 }}>
                        ~{(order.items||[]).reduce((s,i)=>s+Number(i.total_weight_kg||0),0).toFixed(3)} kg
                      </div>
                    )}
                    <button onClick={() => downloadPdf(order.id)}
                      style={{ fontSize: 12, padding: '6px 14px', background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer' }}>
                      {'\u2193'} PDF
                    </button>
                  </div>
                </div>

                {order.status !== 'cancelled' && (
                  <div style={{ padding: '12px 18px', borderTop: `1px solid ${colors.border}`, background: colors.bg }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {STATUS_STEPS.map((step, i) => {
                        const currentIdx = STATUS_STEPS.indexOf(order.status);
                        const done = i <= currentIdx;
                        const active = i === currentIdx;
                        return (
                          <React.Fragment key={step}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 'none' }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${done ? '#22d3a5' : colors.border}`, background: active ? '#22d3a5' : done ? 'rgba(34,211,165,0.2)' : colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4, boxShadow: active ? '0 0 8px rgba(34,211,165,0.5)' : 'none' }}>
                                {done && !active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3a5' }} />}
                              </div>
                              <span style={{ fontSize: 10, color: done ? '#22d3a5' : colors.textFaint, whiteSpace: 'nowrap' }}>{t(step)}</span>
                            </div>
                            {i < STATUS_STEPS.length - 1 && (
                              <div style={{ flex: 1, height: 2, background: i < STATUS_STEPS.indexOf(order.status) ? '#22d3a5' : colors.border, marginBottom: 16, marginTop: 1 }} />
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
