import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { usePrefs } from '../lib/prefs.jsx';

const STATUS_STEPS = ['confirmed', 'in_production', 'shipped', 'delivered'];
const STATUS_LABELS = { confirmed: 'Confirmed', in_production: 'In production', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
const STATUS_COLORS = { confirmed: '#3b82f6', in_production: '#8b5cf6', shipped: '#06b6d4', delivered: '#22d3a5', cancelled: '#ef4444' };
const NEXT_STATUS = { confirmed: 'in_production', in_production: 'shipped', shipped: 'delivered' };

async function downloadDxf(fileId, filename) {
  const token = localStorage.getItem('cq_token');
  const base = import.meta.env.VITE_API_URL || '/api';
  try {
    const res = await fetch(`${base}/files/${fileId}/download`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) { const err = await res.json(); alert(err.error || 'Download failed'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click(); URL.revokeObjectURL(url);
  } catch (e) { alert('Download failed: ' + e.message); }
}

export default function ProviderDashboardPage() {
  const { colors } = usePrefs();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getMyJobs().then(setJobs).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (jobId, status) => {
    setUpdating(jobId);
    try {
      const updated = await api.updateJobStatus(jobId, status);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: updated.status } : j));
    } catch (e) { alert(e.message); }
    finally { setUpdating(null); }
  };

  if (loading) return <div style={{ color: colors.textMuted, padding: 32 }}>Loading...</div>;

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ fontSize: 14, color: colors.textMuted }}>{error}</p>
        <a href="/marketplace" style={{ fontSize: 13, color: colors.accent, textDecoration: 'none' }}>Go to marketplace &rarr;</a>
      </div>
    );
  }

  const totalEarnings = jobs.reduce((s, j) => s + Number(j.total_payout || 0), 0);
  const activeJobs = jobs.filter(j => j.status !== 'delivered' && j.status !== 'cancelled');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: colors.text, marginBottom: 4 }}>My jobs</h1>
        <p style={{ fontSize: 14, color: colors.textMuted }}>{jobs.length} claimed &middot; {activeJobs.length} active</p>
      </div>

      {/* Earnings summary */}
      <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: colors.textMuted }}>Total earnings (ex. VAT)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.accent }}>&euro;{totalEarnings.toFixed(2)}</div>
        </div>
        <a href="/marketplace" style={{ fontSize: 13, color: colors.bg === '#f1f5f9' ? '#fff' : '#0f1117', textDecoration: 'none', background: colors.accent, padding: '8px 18px', borderRadius: 8, fontWeight: 600 }}>Find more jobs &rarr;</a>
      </div>

      {jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: colors.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>&#128230;</div>
          <p style={{ fontSize: 14 }}>No jobs claimed yet</p>
          <a href="/marketplace" style={{ fontSize: 13, color: colors.accent, textDecoration: 'none', display: 'inline-block', marginTop: 8 }}>Browse the marketplace &rarr;</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map(job => {
            const totalWeight = Number(job.total_weight || 0);
            const addr = job.delivery_address || {};
            return (
              <div key={job.id} style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>Job #{job.id.slice(0,8).toUpperCase()}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: `1px solid ${STATUS_COLORS[job.status] || colors.border}`, color: STATUS_COLORS[job.status] || colors.textMuted }}>
                          {STATUS_LABELS[job.status] || job.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: colors.textFaint }}>
                        Customer: {job.customer_name} &middot; Claimed {job.claimed_at ? new Date(job.claimed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: colors.accent }}>&euro;{Number(job.total_payout || 0).toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: colors.textFaint }}>your payout</div>
                    </div>
                  </div>

                  {/* Items with DXF download */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {(job.items || []).map((item, i) => (
                      <div key={i} style={{ fontSize: 12, color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: colors.bg, borderRadius: 6, padding: '6px 10px' }}>
                        <span>&#128208; {item.original_name}</span>
                        <span style={{ color: colors.textMuted, textTransform: 'capitalize' }}>{item.cutting_method} &middot; {item.material?.replace('_',' ')} &middot; {item.thickness_mm}mm &middot; &times;{item.quantity}</span>
                        {item.bounding_box_w_mm && <span style={{ color: colors.textFaint }}>{(+item.bounding_box_w_mm).toFixed(0)}&times;{(+item.bounding_box_h_mm).toFixed(0)}mm</span>}
                        {item.total_weight_kg && <span style={{ color: colors.textFaint }}>{Number(item.total_weight_kg).toFixed(3)}kg</span>}
                        {item.file_id && (
                          <button onClick={() => downloadDxf(item.file_id, item.original_name)}
                            style={{ fontSize: 11, padding: '2px 8px', background: colors.accentBg, color: colors.accent, border: `1px solid ${colors.accent}40`, borderRadius: 5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            &darr; DXF
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Delivery info */}
                  {addr.street && (
                    <div style={{ fontSize: 11, color: colors.textFaint }}>
                      &#128205; {addr.name} &middot; {addr.street}, {addr.city} {addr.postal_code}, {addr.country}
                    </div>
                  )}
                  {job.phone && (
                    <div style={{ fontSize: 11, color: colors.textFaint, marginTop: 3 }}>&#128222; {job.phone}</div>
                  )}
                </div>

                {/* Status actions */}
                {job.status !== 'cancelled' && job.status !== 'delivered' && NEXT_STATUS[job.status] && (
                  <div style={{ padding: '10px 18px', borderTop: `1px solid ${colors.border}`, background: colors.bg, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => updateStatus(job.id, NEXT_STATUS[job.status])} disabled={updating === job.id}
                      style={{ fontSize: 12, padding: '6px 14px', background: colors.accent, color: colors.bg === '#f1f5f9' ? '#fff' : '#0f1117', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                      {updating === job.id ? '...' : `Mark as ${STATUS_LABELS[NEXT_STATUS[job.status]]} \u2192`}
                    </button>
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
