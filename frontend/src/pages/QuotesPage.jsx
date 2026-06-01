import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const STATUS_COLORS = {
  draft: '#475569', sent: '#3b82f6', accepted: '#22d3a5',
  rejected: '#ef4444', ordered: '#a855f7',
};

function SvgThumbnail({ svgContent }) {
  if (!svgContent) {
    return (
      <div style={{ width: 72, height: 72, background: '#0f1117', borderRadius: 7, border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>📐</span>
      </div>
    );
  }
  return (
    <div style={{ width: 72, height: 72, background: '#0f1117', borderRadius: 7, border: '1px solid #1e293b', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        dangerouslySetInnerHTML={{ __html: svgContent }}
        style={{ width: 64, height: 64, transform: 'scale(0.16)', transformOrigin: 'center', pointerEvents: 'none' }}
      />
    </div>
  );
}

function QuoteCard({ quote, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#0f1117', borderRadius: 8 }}>
      <SvgThumbnail svgContent={quote.svg_content} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {quote.original_name}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            ['Method', quote.cutting_method],
            ['Material', quote.material?.replace('_', ' ')],
            ['Thickness', `${quote.thickness_mm} mm`],
            ['Qty', `×${quote.quantity}`],
            ['Size', quote.bounding_box_w_mm ? `${(+quote.bounding_box_w_mm).toFixed(0)}×${(+quote.bounding_box_h_mm).toFixed(0)} mm` : '—'],
          ].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 10, color: '#475569' }}>{l}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'capitalize' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#22d3a5' }}>€{(+quote.total_price).toFixed(2)}</div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>ex. VAT</div>
        {!quote.order_id && (
          <button onClick={() => onDelete(quote.id)} style={{ fontSize: 11, padding: '3px 8px', background: 'transparent', color: '#475569', border: '1px solid #1e293b', borderRadius: 5, cursor: 'pointer' }}>✕</button>
        )}
      </div>
    </div>
  );
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getQuotes().then(setQuotes).finally(() => setLoading(false));
  }, []);

  const deleteQuote = async (id) => {
    if (!confirm('Delete this quote?')) return;
    await api.deleteQuote(id);
    setQuotes(q => q.filter(x => x.id !== id));
  };

  if (loading) return <div style={{ color: '#475569', padding: 32 }}>Loading...</div>;

  // Group by order_id — ordered quotes together, unordered individually
  const groups = [];
  const orderMap = {};

  for (const q of quotes) {
    if (q.order_id) {
      if (!orderMap[q.order_id]) {
        orderMap[q.order_id] = { type: 'order', order_id: q.order_id, quotes: [], created_at: q.created_at };
        groups.push(orderMap[q.order_id]);
      }
      orderMap[q.order_id].quotes.push(q);
    } else {
      // Group unordered quotes by proximity in time (within 60 seconds = same session)
      const last = groups[groups.length - 1];
      const qTime = new Date(q.created_at).getTime();
      const lastTime = last ? new Date(last.created_at).getTime() : 0;
      if (last && last.type === 'draft' && Math.abs(qTime - lastTime) < 60000) {
        last.quotes.push(q);
      } else {
        groups.push({ type: 'draft', quotes: [q], created_at: q.created_at });
      }
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#f8fafc', marginBottom: 4 }}>Quotes</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>{quotes.length} quote{quotes.length !== 1 ? 's' : ''} · {groups.length} group{groups.length !== 1 ? 's' : ''}</p>
      </div>

      {quotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#475569' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 15 }}>No quotes yet</p>
          <a href="/" style={{ fontSize: 13, color: '#22d3a5', textDecoration: 'none', display: 'inline-block', marginTop: 8 }}>
            Upload a DXF to get started →
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groups.map((group, gi) => {
            const groupTotal = group.quotes.reduce((s, q) => s + Number(q.total_price), 0);
            const groupVat = groupTotal * 0.20;
            const isOrdered = group.type === 'order';
            const date = new Date(group.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

            return (
              <div key={gi} style={{ background: '#151a25', border: `1px solid ${isOrdered ? '#2d1b69' : '#1e293b'}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1e293b', background: isOrdered ? 'rgba(168,85,247,0.05)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14 }}>{isOrdered ? '📦' : '📋'}</span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>
                        {isOrdered ? `Order #${group.order_id.slice(0,8).toUpperCase()}` : `Draft · ${date}`}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b', marginLeft: 10 }}>
                        {group.quotes.length} part{group.quotes.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {isOrdered && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: '1px solid #7c3aed', color: '#a855f7' }}>Ordered</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#22d3a5' }}>€{(groupTotal + groupVat).toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>€{groupTotal.toFixed(2)} ex. VAT</div>
                  </div>
                </div>

                {/* Quote cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '10px 12px', background: '#151a25' }}>
                  {group.quotes.map(q => (
                    <QuoteCard key={q.id} quote={q} onDelete={deleteQuote} />
                  ))}
                </div>

                {/* Group footer totals */}
                {group.quotes.length > 1 && (
                  <div style={{ padding: '10px 16px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end', gap: 20 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Subtotal ex. VAT: <span style={{ color: '#94a3b8' }}>€{groupTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      VAT (20%): <span style={{ color: '#94a3b8' }}>€{groupVat.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#22d3a5' }}>
                      Total: €{(groupTotal + groupVat).toFixed(2)}
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
