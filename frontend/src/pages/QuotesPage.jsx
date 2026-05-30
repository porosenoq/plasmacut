import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const STATUS_COLORS = {
  draft: '#475569', sent: '#3b82f6', accepted: '#22d3a5', rejected: '#ef4444', ordered: '#a855f7',
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(null);

  useEffect(() => {
    api.getQuotes().then(setQuotes).finally(() => setLoading(false));
  }, []);

  const deleteQuote = async (id) => {
    if (!confirm('Delete this quote?')) return;
    await api.deleteQuote(id);
    setQuotes(q => q.filter(x => x.id !== id));
  };

  const placeOrder = async (quote) => {
    setOrdering(quote.id);
    try {
      await api.createOrder({ quote_id: quote.id, delivery_address: {} });
      setQuotes(qs => qs.map(q => q.id === quote.id ? { ...q, status: 'ordered' } : q));
    } catch (e) { alert(e.message); }
    finally { setOrdering(null); }
  };

  if (loading) return <div style={{ color: '#475569', padding: 32 }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#f8fafc', marginBottom: 4 }}>My quotes</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>{quotes.length} quote{quotes.length !== 1 ? 's' : ''}</p>
      </div>

      {quotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#475569' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 15 }}>No quotes yet</p>
          <a href="/" style={{ fontSize: 13, color: '#22d3a5', textDecoration: 'none', display: 'inline-block', marginTop: 8 }}>Upload a DXF to get started →</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {quotes.map(q => (
            <div key={q.id} style={{ background: '#151a25', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>{q.original_name}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: `1px solid ${STATUS_COLORS[q.status]}`, color: STATUS_COLORS[q.status] }}>{q.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {[
                      ['Method', q.cutting_method],
                      ['Material', q.material?.replace('_', ' ')],
                      ['Thickness', `${q.thickness_mm} mm`],
                      ['Qty', `${q.quantity} parts`],
                      ['Size', q.bounding_box_w_mm ? `${(+q.bounding_box_w_mm).toFixed(0)}×${(+q.bounding_box_h_mm).toFixed(0)} mm` : '—'],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 10, color: '#475569' }}>{l}</div>
                        <div style={{ fontSize: 13, color: '#94a3b8', textTransform: 'capitalize' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#22d3a5' }}>€{(+q.total_price).toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>
                    {new Date(q.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {q.status !== 'ordered' && (
                      <button onClick={() => placeOrder(q)} disabled={ordering === q.id} style={{ fontSize: 12, padding: '5px 12px', background: '#22d3a5', color: '#0f1117', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                        {ordering === q.id ? '...' : 'Order'}
                      </button>
                    )}
                    <button onClick={() => deleteQuote(q.id)} style={{ fontSize: 12, padding: '5px 10px', background: 'transparent', color: '#475569', border: '1px solid #1e293b', borderRadius: 6, cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
