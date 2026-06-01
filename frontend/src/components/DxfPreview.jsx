import React, { useRef, useState } from 'react';
import { usePrefs } from '../lib/prefs.jsx';

export default function DxfPreview({ file, svgContent, compact = false }) {
  const { t, colors } = usePrefs();
  const [view, setView] = useState('preview');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const previewHeight = compact ? 220 : 280;

  const onMouseDown = (e) => { dragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; };
  const onMouseMove = (e) => { if (!dragging.current) return; setPan(p => ({ x: p.x + e.clientX - lastPos.current.x, y: p.y + e.clientY - lastPos.current.y })); lastPos.current = { x: e.clientX, y: e.clientY }; };
  const onMouseUp = () => { dragging.current = false; };
  const onWheel = (e) => { e.preventDefault(); setZoom(z => Math.max(0.3, Math.min(5, z * (e.deltaY < 0 ? 1.1 : 0.91)))); };
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const stats = [
    { label: t('boundingBox'), value: file?.bounding_box_w_mm ? `${(+file.bounding_box_w_mm).toFixed(1)} \u00D7 ${(+file.bounding_box_h_mm).toFixed(1)} mm` : '\u2014' },
    { label: t('cutLength'), value: file?.cut_length_mm ? `${(+file.cut_length_mm / 1000).toFixed(2)} m` : '\u2014' },
    { label: t('entities'), value: file?.entity_count ?? '\u2014' },
    { label: t('holes'), value: file?.hole_count ?? '\u2014' },
  ];

  return (
    <div style={{ background: compact ? 'transparent' : colors.cardBg, border: compact ? 'none' : `1px solid ${colors.border}`, borderRadius: compact ? 0 : 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!compact && <span style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{file?.original_name}</span>}
          {file?.open_contours > 0 && (
            <span style={{ fontSize: 11, background: '#2d1f00', color: '#fbbf24', border: '1px solid #92400e', borderRadius: 4, padding: '2px 7px' }}>
              &#9888; {file.open_contours} {file.open_contours > 1 ? t('openContoursPlural') : t('openContours')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['preview', t('preview')], ['info', t('details')]].map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, border: `1px solid ${colors.border}`, cursor: 'pointer', background: view === v ? colors.bgTertiary : 'transparent', color: view === v ? colors.text : colors.textMuted }}>{l}</button>
          ))}
        </div>
      </div>

      {view === 'preview' && (
        <>
          <div style={{ background: '#0f1117', height: previewHeight, overflow: 'hidden', cursor: 'grab', position: 'relative', userSelect: 'none' }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}>
            <div style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: 'center', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {svgContent ? <div dangerouslySetInnerHTML={{ __html: svgContent }} style={{ display: 'flex' }} /> : <div style={{ color: '#334155', fontSize: 13 }}>No preview</div>}
            </div>
            <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[['+', () => setZoom(z => Math.min(5, z * 1.2))], ['-', () => setZoom(z => Math.max(0.3, z * 0.83))], ['o', reset]].map(([lbl, fn]) => (
                <button key={lbl} onClick={fn} style={{ width: 26, height: 26, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5, color: '#e2e8f0', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, padding: '6px 12px', borderTop: `1px solid ${colors.border}`, flexWrap: 'wrap' }}>
            {[['#22d3a5', t('cutLines')], ['#378ADD', t('holes')], ['#EF9F27', t('bendLines')]].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: colors.textMuted }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />{l}
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'info' && (
        <div style={{ padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: colors.bg, borderRadius: 7, padding: '8px 12px' }}>
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{s.value}</div>
              </div>
            ))}
          </div>
          {file?.open_contours > 0 && (
            <div style={{ marginTop: 10, background: '#1a1000', border: '1px solid #92400e', borderRadius: 7, padding: '8px 12px', fontSize: 12, color: '#fbbf24' }}>
              &#9888; {file.open_contours} {file.open_contours > 1 ? t('openContoursPlural') : t('openContours')} {t('openContoursWarning')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
