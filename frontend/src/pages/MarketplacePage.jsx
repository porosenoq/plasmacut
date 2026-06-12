import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { usePrefs } from '../lib/prefs.jsx';

function SvgThumb({ svgContent, colors }) {
  if (!svgContent) {
    return (
      <div style={{ width: 64, height: 64, background: colors.bg, borderRadius: 8, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: colors.textFaint, fontSize: 10 }}>
        no preview
      </div>
    );
  }
  let sized = svgContent;
  if (sized.includes('width="400"')) {
    sized = sized.replace('width="400"', 'width="64"').replace('height="400"', 'height="64"');
  } else {
    sized = sized.replace(/<svg /, '<svg width="64" height="64" ');
  }
  if (!sized.includes('viewBox')) sized = sized.replace(/<svg /, '<svg viewBox="0 0 400 400" ');
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  return (
    <div style={{ width: 64, height: 64, borderRadius: 8, border: `1px solid ${colors.border}`, overflow: 'hidden', flexShrink: 0 }}>
      <img src={dataUrl} width={64} height={64} alt="part" style={{ display: 'block' }} />
    </div>
  );
}

export default function MarketplacePage() {
  const { colors } = usePrefs();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getMarketplaceJobs(), api.getProviderStatus()])
      .then(([j, s]) => { setJobs(j); setProviderStatus(s); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const claim = async (jobId) => {
    setClaiming(jobId); setError('');
    try {
      await api.claimJob(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (e) {
      setError(e.message);
      // Refresh list since job may already be claimed by someone else
      api.getMarketplaceJobs().then(setJobs).catch(() => {});
    } finally {
      setClaiming(null);
    }
  };

  if (loading) return <div style={{ color: colors.textMuted, padding: 32 }}>Loading...</div>;

  const isProvider = providerStatus?.is_provider;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: colors.text, marginBottom: 4 }}>Marketplace</h1>
        <p style={{ fontSize: 14, color: colors.textMuted }}>
          {jobs.length} open job{jobs.length !== 1 ? 's' : ''} available for laser/plasma cutting providers
        </p>
      </div>

      {!isProvider && (
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          {providerStatus?.application?.status === 'pending' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>&#9203;</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>Application pending review</div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>We'll notify you once an admin reviews your provider application.</div>
              </div>
            </div>
          ) : providerStatus?.application?.status === 'rejected' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>Application not approved</div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>You can re-apply with updated equipment details.</div>
              </div>
              <a href="/provider-apply" style={{ fontSize: 13, color: colors.accent, textDecoration: 'none', background: colors.accentBg, padding: '8px 16px', borderRadius: 6, whiteSpace: 'nowrap' }}>Re-apply &rarr;</a>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>Have a laser or plasma cutter?</div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Apply to become a provider and start claiming jobs from this board.</div>
              </div>
              <a href="/provider-apply" style={{ fontSize: 13, color: colors.bg === '#f1f5f9' ? '#fff' : '#0f1117', textDecoration: 'none', background: colors.accent, padding: '8px 16px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap' }}>Apply as provider &rarr;</a>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: colors.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>&#128230;</div>
          <p style={{ fontSize: 14 }}>No open jobs right now. Check back later!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map(job => {
            const totalPayout = Number(job.total_payout || 0);
            const totalWeight = Number(job.total_weight || 0);
            const addr = job.delivery_address || {};
            return (
              <div key={job.id} style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 2 }}>Job #{job.id.slice(0,8).toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: colors.textFaint }}>
                      Posted {new Date(job.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {addr.city && ` \u00B7 ${addr.city}, ${addr.country}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: colors.accent }}>&euro;{totalPayout.toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: colors.textFaint }}>your payout (ex. VAT)</div>
                  </div>
                </div>

                {/* Parts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {(job.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: colors.bg, borderRadius: 8, padding: '8px 10px' }}>
                      <SvgThumb svgContent={item.svg_content} colors={colors} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: colors.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.original_name}</div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: colors.textMuted }}>
                          <span style={{ textTransform: 'capitalize' }}>{item.cutting_method}</span>
                          <span style={{ textTransform: 'capitalize' }}>{item.material?.replace('_',' ')}</span>
                          <span>{item.thickness_mm}mm</span>
                          <span>&times;{item.quantity}</span>
                          {item.bounding_box_w_mm && <span>{(+item.bounding_box_w_mm).toFixed(0)}&times;{(+item.bounding_box_h_mm).toFixed(0)}mm</span>}
                          {item.total_weight_kg && <span>{Number(item.total_weight_kg).toFixed(3)}kg</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: colors.accent, flexShrink: 0 }}>&euro;{Number(item.provider_total_payout || 0).toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: colors.textFaint }}>
                    {totalWeight > 0 && `Est. total weight: ${totalWeight.toFixed(3)} kg`}
                  </div>
                  {isProvider ? (
                    <button onClick={() => claim(job.id)} disabled={claiming === job.id}
                      style={{ fontSize: 13, padding: '8px 20px', background: colors.accent, color: colors.bg === '#f1f5f9' ? '#fff' : '#0f1117', border: 'none', borderRadius: 8, fontWeight: 600, cursor: claiming === job.id ? 'not-allowed' : 'pointer' }}>
                      {claiming === job.id ? 'Claiming...' : 'Claim this job'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: colors.textFaint }}>Apply as provider to claim jobs</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
