import React, { useRef, useState } from 'react';

export default function DxfPreview({ file, svgContent, compact = false }) {
  const [view, setView] = useState('preview');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const previewHeight = compact ? 220 : 280;

  const handleMouseDown = (e) => { dragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; };
  const handleMouseMove = (e) => {
    if (!dragging.current) return;
    setPan(p => ({ x: p.x + e.clientX - lastPos.current.x, y: p.y + e.clientY - lastPos.current.y }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => { dragging.current = false; };
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(5, z * (e.deltaY < 0 ? 1.1 : 0.91))));
  };
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const stats = [
    { label: 'Bounding box', value: file?.bounding_box_w_mm ? `${(+file.bounding_box_w_mm).toFixed(1)} × ${(+file.bounding_box_h_mm).toFixed(1)} mm` : '—' },
    { label: 'Cut length', value: file?.cut_length_mm ? `${(+file.cut_length_mm / 1000).toFixed(2)} m` : '—' },
    { label: 'Entities', value: file?.entity_count ?? '—' },
    { label: 'Holes', value: file?.hole_count ?? '—' },
  ];

  return (
    <div style={{ background: compact ? 'transparent' : '#151a25', border: compact ? 'none' : '1px solid #1e293b', borderRadius: compact ? 0 : 12, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!compact && <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{file?.original_name}</span>}
          {file?.open_contours > 0 && (
            <span style={{ fontSize: 11, background: '#2d1f00', color: '#fbbf24', border: '1px solid #92400e', borderRadius: 4, padding: '2px 7px' }}>
              ⚠ {file.open_contours} open contour{file.open_contours > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['preview', 'info'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              fontSize: 11, padding: '3px 9px', borderRadius: 5, border: '1px solid #1e293b', cursor: 'pointer',
              background: view === v ? '#1e293b' : 'transparent', color: view === v ? '#f8fafc' : '#64748b',
            }}>{v === 'preview' ? 'Preview' : 'Details'}</button>
          ))}
        </div>
      </div>

      {/* SVG canvas */}
      {view === 'preview' && (
        <>
          <div style={{ background: '#0f1117', height: previewHeight, overflow: 'hidden', cursor: 'grab', position: 'relative', userSelect: 'none' }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
            onWheel={handleWheel}>
            <div style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: 'center', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {svgContent
                ? <div dangerouslySetInnerHTML={{ __html: svgContent }} style={{ display: 'flex' }} />
                : <div style={{ color: '#334155', fontSize: 13 }}>No preview available</div>
              }
            </div>
            <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[['＋', () => setZoom(z => Math.min(5, z * 1.2))], ['－', () => setZoom(z => Math.max(0.3, z * 0.83))], ['⌂', reset]].map(([lbl, fn]) => (
                <button key={lbl} onClick={fn} style={{ width: 26, height: 26, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5, color: '#e2e8f0', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, padding: '6px 12px', borderTop: '1px solid #1e293b', flexWrap: 'wrap' }}>
            {[['#22d3a5', 'Cut lines'], ['#378ADD', 'Holes'], ['#EF9F27', 'Bend lines']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />{l}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Details */}
      {view === 'info' && (
        <div style={{ padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: '#0f1117', borderRadius: 7, padding: '8px 12px' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#f8fafc' }}>{s.value}</div>
              </div>
            ))}
          </div>
          {file?.open_contours > 0 && (
            <div style={{ marginTop: 10, background: '#1a1000', border: '1px solid #92400e', borderRadius: 7, padding: '8px 12px', fontSize: 12, color: '#fbbf24' }}>
              ⚠ {file.open_contours} open contour{file.open_contours > 1 ? 's' : ''} detected — these paths will not be cut.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
