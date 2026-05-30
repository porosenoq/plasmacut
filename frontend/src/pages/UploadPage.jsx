import React, { useState, useRef } from 'react';
import { api } from '../lib/api.js';
import DxfPreview from '../components/DxfPreview.jsx';
import QuoteConfigurator from '../components/QuoteConfigurator.jsx';

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [svgContent, setSvgContent] = useState(null);
  const [error, setError] = useState('');
  const [savedQuote, setSavedQuote] = useState(null);
  const inputRef = useRef();

  const handleFile = async (f) => {
    if (!f || !f.name.endsWith('.dxf')) {
      setError('Please upload a .dxf file');
      return;
    }
    setError(''); setUploading(true); setFile(null); setSvgContent(null); setSavedQuote(null);
    try {
      const form = new FormData();
      form.append('file', f);
      const res = await api.uploadFile(form);
      setFile(res.file);
      if (res.parsed?.svg_content) setSvgContent(res.parsed.svg_content);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const reset = () => { setFile(null); setSvgContent(null); setSavedQuote(null); setError(''); };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#f8fafc', marginBottom: 6 }}>New quote</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Upload a DXF file to get an instant laser or plasma cutting quote.</p>
      </div>

      {!file && !uploading && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#22d3a5' : '#1e293b'}`,
            borderRadius: 12, padding: '56px 24px', textAlign: 'center', cursor: 'pointer',
            background: dragging ? 'rgba(34,211,165,0.04)' : 'transparent', transition: 'all 0.15s',
            marginBottom: error ? 12 : 0,
          }}>
          <input ref={inputRef} type="file" accept=".dxf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          <div style={{ fontSize: 40, marginBottom: 12 }}>📐</div>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#e2e8f0', marginBottom: 6 }}>Drop your DXF file here</p>
          <p style={{ fontSize: 13, color: '#475569' }}>or click to browse — max 20 MB</p>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16 }}>
            {['Laser cutting', 'Plasma cutting', 'Instant pricing'].map(t => (
              <span key={t} style={{ fontSize: 12, color: '#22d3a5', background: 'rgba(34,211,165,0.08)', padding: '4px 10px', borderRadius: 99 }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {uploading && (
        <div style={{ border: '1px solid #1e293b', borderRadius: 12, padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Uploading and parsing DXF...</div>
          <div style={{ width: 200, height: 3, background: '#1e293b', borderRadius: 99, margin: '0 auto', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#22d3a5', borderRadius: 99, animation: 'slide 1.2s infinite ease-in-out', width: '40%' }} />
          </div>
          <style>{`@keyframes slide { 0%{margin-left:-40%} 100%{margin-left:100%} }`}</style>
        </div>
      )}

      {error && (
        <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {file && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={reset} style={{ fontSize: 12, color: '#64748b', background: 'transparent', border: '1px solid #1e293b', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
              ↑ Upload different file
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
            <DxfPreview file={file} svgContent={svgContent} />
            <QuoteConfigurator file={file} onQuoteSaved={setSavedQuote} />
          </div>

          {savedQuote && (
            <div style={{ marginTop: 16, background: '#0a1f0f', border: '1px solid #166534', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#4ade80' }}>✓ Quote saved successfully</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Quote #{savedQuote.id?.slice(0, 8)} · €{savedQuote.total_price}</div>
              </div>
              <a href="/quotes" style={{ fontSize: 13, color: '#22d3a5', textDecoration: 'none', background: 'rgba(34,211,165,0.1)', padding: '6px 14px', borderRadius: 6 }}>View quotes →</a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
