import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { usePrefs } from '../lib/prefs.jsx';

function SvgThumbnail({ svgContent, onExpand, colors }) {
  if (!svgContent) {
    return (
      <div style={{ width: 80, height: 80, background: colors.bg, borderRadius: 8, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: colors.textFaint, fontSize: 11 }}>
        no preview
      </div>
    );
  }

  let sized = svgContent;
  if (sized.includes('width="400"')) {
    sized = sized.replace('width="400"', 'width="80"').replace('height="400"', 'height="80"');
  } else {
    sized = sized.replace(/<svg /, '<svg width="80" height="80" ');
  }
  if (!sized.includes('viewBox')) {
    sized = sized.replace(/<svg /, '<svg viewBox="0 0 400 400" ');
  }

  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);

  return (
    <div onClick={onExpand} style={{ width: 80, height: 80, borderRadius: 8, border: `1px solid ${colors.border}`, overflow: 'hidden', flexShrink: 0, cursor: 'pointer', position: 'relative' }} title="Click to enlarge">
      <img src={dataUrl} width={80} height={80} alt="DXF preview" style={{ display: 'block' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 8, transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,211,165,0.12)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />
    </div>
  );
}

function SvgModal({ svgContent, filename, onClose, colors }) {
  if (!svgContent) return null;
  let sized = svgContent;
  if (sized.includes('width="400"')) {
    sized = sized.replace('width="400"', 'width="480"').replace('height="400"', 'height="480"');
  } else {
    sized = sized.replace(/<svg /, '<svg width="480" height="480" ');
  }
  if (!sized.includes('viewBox')) {
    sized = sized.replace(/<svg /, '<svg viewBox="0 0 400 400" ');
  }
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 14, overflow: 'hidden', maxWidth: 540, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${colors.border}` }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{filename}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>{'\u00D7'}</button>
        </div>
        <div style={{ background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={dataUrl} width={480} height={480} alt="DXF preview" style={{ display: 'block', borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );
}

function QuoteCard({ quote, onDelete, colors, t }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: colors.bg, borderRadius: 8 }}>
        <SvgThumbnail svgContent={quote.svg_content} onExpand={() => setExpanded(true)} colors={colors} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: colors.text, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {quote.original_name}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {[
              ['Method', quote.cutting_method],
              [t('material'), quote.material?.replace('_', ' ')],
              [t('thickness'), `${quote.thickness_mm} mm`],
              ['Qty', `\u00D7${quote.quantity}`],
              ['Size', quote.bounding_box_w_mm ? `${(+quote.bounding_box_w_mm).toFixed(0)}\u00D7${(+quote.bounding_box_h_mm).toFixed(0)} mm` : '---'],
              ['Weight', quote.total_weight_kg ? `${(+quote.total_weight_kg).toFixed(3)} kg` : '---'],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 10, color: colors.textFaint }}>{l}</div>
                <div style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: colors.accent }}>{'\u20AC'}{(+quote.total_price).toFixed(2)}</div>
          <div style={{ fontSize: 11, color: colors.textFaint, marginBottom: 6 }}>{t('exVat')}</div>
          {!quote.order_id && (
            <button onClick={() => onDelete(quote.id)}
              style={{ fontSize: 11, padding: '3px 8px', background: 'transparent', color: colors.textFaint, border: `1px solid ${colors.border}`, borderRadius: 5, cursor: 'pointer' }}>
              {t('remove')}
            </button>
          )}
        </div>
      </div>
      {expanded && <SvgModal svgContent={quote.svg_content} filename={quote.original_name} onClose={() => setExpanded(false)} colors={colors} />}
    </>
  );
}

export default function QuotesPage() {
  const { colors, t } = usePrefs();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getQuotes().then(setQuotes).finally(() => setLoading(false)); }, []);

  const deleteQuote = async (id) => {
    if (!confirm('Delete this quote?')) return;
    await api.deleteQuote(id);
    setQuotes(q => q.filter(x => x.id !== id));
  };

  if (loading) return <div style={{ color: colors.textMuted, padding: 32 }}>Loading...</div>;

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
        <h1 style={{ fontSize: 24, fontWeight: 600, color: colors.text, marginBottom: 4 }}>{t('quotesTitle')}</h1>
        <p style={{ fontSize: 14, color: colors.textMuted }}>{quotes.length} {quotes.length !== 1 ? t('quotes').toLowerCase() : 'quote'} &middot; {groups.length} {groups.length !== 1 ? t('groups') : t('group')}</p>
      </div>

      {quotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: colors.textMuted }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 15 }}>{t('noQuotes')}</p>
          <a href="/" style={{ fontSize: 13, color: colors.accent, textDecoration: 'none', display: 'inline-block', marginTop: 8 }}>{t('uploadToStart')}</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groups.map((group, gi) => {
            const groupTotal = group.quotes.reduce((s, q) => s + Number(q.total_price), 0);
            const groupVat = groupTotal * 0.20;
            const isOrdered = group.type === 'order';
            const date = new Date(group.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

            return (
              <div key={gi} style={{ background: colors.cardBg, border: `1px solid ${isOrdered ? '#2d1b69' : colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, background: isOrdered ? 'rgba(168,85,247,0.05)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>
                        {isOrdered ? `Order #${group.order_id.slice(0, 8).toUpperCase()}` : `${t('draft')} -- ${date}`}
                      </span>
                      <span style={{ fontSize: 12, color: colors.textMuted, marginLeft: 10 }}>
                        {group.quotes.length} {group.quotes.length > 1 ? t('parts') : t('part')}
                      </span>
                    </div>
                    {isOrdered && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: '1px solid #7c3aed', color: '#a855f7' }}>{t('ordered')}</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: colors.accent }}>{'\u20AC'}{(groupTotal + groupVat).toFixed(2)} {t('incVat')}</div>
                    <div style={{ fontSize: 11, color: colors.textFaint }}>{'\u20AC'}{groupTotal.toFixed(2)} {t('exVat')}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px' }}>
                  {group.quotes.map(q => <QuoteCard key={q.id} quote={q} onDelete={deleteQuote} colors={colors} t={t} />)}
                </div>

                {group.quotes.length > 1 && (
                  <div style={{ padding: '10px 16px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end', gap: 20 }}>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{t('subtotalExVat')}: <span style={{ color: colors.textSecondary }}>{'\u20AC'}{groupTotal.toFixed(2)}</span></div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{t('vat')}: <span style={{ color: colors.textSecondary }}>{'\u20AC'}{groupVat.toFixed(2)}</span></div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>Weight: <span style={{ color: colors.textSecondary }}>{group.quotes.reduce((s,q) => s + Number(q.total_weight_kg||0), 0).toFixed(3)} kg</span></div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.accent }}>{t('totalIncVat')}: {'\u20AC'}{(groupTotal + groupVat).toFixed(2)}</div>
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
