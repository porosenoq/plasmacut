import React, { useState, useRef } from 'react';
import { api } from '../lib/api.js';
import DxfPreview from '../components/DxfPreview.jsx';
import FileQuoteRow from '../components/FileQuoteRow.jsx';
import CheckoutModal from '../components/CheckoutModal.jsx';

const VAT_RATE = 0.20;

export default function UploadPage() {
  const [method, setMethod] = useState('laser');
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const inputRef = useRef();

  const handleFiles = async (fileList) => {
    const dxfFiles = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.dxf'));
    if (!dxfFiles.length) return;

    const placeholders = dxfFiles.map(f => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      file: null, svgContent: null, pricing: null,
      savedQuote: null,
      form: { material: 'mild_steel', thickness: 2, quantity: 1 },
      loading: true, error: null,
    }));
    setFiles(prev => [...prev, ...placeholders]);

    dxfFiles.forEach(async (rawFile, i) => {
      const pid = placeholders[i].id;
      try {
        const form = new FormData();
        form.append('file', rawFile);
        const res = await api.uploadFile(form);
        setFiles(prev => prev.map(f =>
          f.id === pid ? { ...f, file: res.file, svgContent: res.parsed?.svg_content ?? null, loading: false } : f
        ));
      } catch (e) {
        setFiles(prev => prev.map(f => f.id === pid ? { ...f, loading: false, error: e.message } : f));
      }
    });
  };

  const updatePricing = (pid, pricing) =>
    setFiles(prev => prev.map(f => f.id === pid ? { ...f, pricing } : f));
  const updateForm = (pid, form) =>
    setFiles(prev => prev.map(f => f.id === pid ? { ...f, form } : f));
  const setSavedQuote = (pid, quote) =>
    setFiles(prev => prev.map(f => f.id === pid ? { ...f, savedQuote: quote } : f));
  const removeFile = (pid) =>
    setFiles(prev => prev.filter(f => f.id !== pid));

  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); };

  const readyFiles = files.filter(f => f.pricing);
  const savedFiles = files.filter(f => f.savedQuote);
  const subtotal = readyFiles.reduce((sum, f) => sum + (f.pricing?.total_ex_vat ?? 0), 0);
  const vatAmount = subtotal * VAT_RATE;
  const grandTotal = subtotal + vatAmount;

  const checkoutQuotes = savedFiles.map(f => ({ ...f.savedQuote, original_name: f.file?.original_name }));
  const checkoutSubtotal = savedFiles.reduce((sum, f) => sum + Number(f.savedQuote?.total_price ?? 0), 0);

  const handleOrderSuccess = (result) => {
    setShowCheckout(false);
    setCompletedOrder(result.order);
    setFiles([]);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#f8fafc', marginBottom: 6 }}>New quote</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Select cutting method, upload DXF files, configure each part, then place your order.</p>
      </div>

      {/* Completed order banner */}
      {completedOrder && (
        <div style={{ background: '#0a1f0f', border: '1px solid #166534', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#4ade80' }}>✓ Order placed successfully!</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Order #{completedOrder.id.slice(0,8).toUpperCase()} · A confirmation email has been sent.
            </div>
          </div>
          <a href="/orders" style={{ fontSize: 13, color: '#22d3a5', textDecoration: 'none', background: 'rgba(34,211,165,0.1)', padding: '6px 14px', borderRadius: 6 }}>
            Track order →
          </a>
        </div>
      )}

      {/* Step 1: Method */}
      <div style={{ background: '#151a25', border: '1px solid #1e293b', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Step 1 — Cutting method (applies to all files)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 480 }}>
          {[
            ['laser', '🔥', 'Laser cutting', '±0.1 mm — best for thin & intricate parts'],
            ['plasma', '⚡', 'Plasma cutting', '±0.5 mm — fast & economical for thick metal'],
          ].map(([val, icon, name, desc]) => (
            <button key={val} onClick={() => setMethod(val)} style={{
              padding: '12px 14px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
              border: `1px solid ${method === val ? '#22d3a5' : '#1e293b'}`,
              background: method === val ? 'rgba(34,211,165,0.08)' : '#0f1117',
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{name}</div>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Upload */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Step 2 — Upload DXF files
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#22d3a5' : '#1e293b'}`,
            borderRadius: 12, padding: '28px 24px', textAlign: 'center', cursor: 'pointer',
            background: dragging ? 'rgba(34,211,165,0.04)' : 'transparent', transition: 'all 0.15s',
          }}>
          <input ref={inputRef} type="file" accept=".dxf" multiple style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)} />
          <div style={{ fontSize: 28, marginBottom: 8 }}>📐</div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 4 }}>
            Drop DXF files here or click to browse
          </p>
          <p style={{ fontSize: 12, color: '#475569' }}>Multiple files supported · max 20 MB each</p>
        </div>
      </div>

      {/* Step 3: File rows */}
      {files.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Step 3 — Configure each part
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {files.map(entry => (
              <FileQuoteRow
                key={entry.id}
                entry={entry}
                method={method}
                onPricing={p => updatePricing(entry.id, p)}
                onFormChange={f => updateForm(entry.id, f)}
                onRemove={() => removeFile(entry.id)}
                onQuoteSaved={q => setSavedQuote(entry.id, q)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Order summary */}
      {readyFiles.length > 0 && (
        <div style={{ background: '#151a25', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 14 }}>Order summary</div>

          {readyFiles.map(f => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #0f1117', color: '#64748b' }}>
              <span style={{ color: '#94a3b8' }}>
                {f.file?.original_name}
                <span style={{ fontSize: 11, marginLeft: 6 }}>× {f.form.quantity}</span>
                {f.savedQuote && <span style={{ fontSize: 11, color: '#22d3a5', marginLeft: 6 }}>✓ saved</span>}
              </span>
              <span>€{f.pricing.total_ex_vat}</span>
            </div>
          ))}

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: '#64748b' }}>
              <span>Subtotal (ex. VAT)</span><span>€{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: '#64748b' }}>
              <span>VAT (20%)</span><span>€{vatAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, padding: '10px 0 0', color: '#f8fafc', borderTop: '1px solid #1e293b', marginTop: 6 }}>
              <span>Total inc. VAT</span>
              <span style={{ color: '#22d3a5' }}>€{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowCheckout(true)}
              disabled={savedFiles.length === 0}
              title={savedFiles.length === 0 ? 'Save at least one quote first' : ''}
              style={{
                flex: 1, padding: '12px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600,
                cursor: savedFiles.length > 0 ? 'pointer' : 'not-allowed',
                background: savedFiles.length > 0 ? '#22d3a5' : '#1e293b',
                color: savedFiles.length > 0 ? '#0f1117' : '#475569',
              }}>
              Proceed to checkout →
            </button>
          </div>
          {savedFiles.length === 0 && readyFiles.length > 0 && (
            <p style={{ fontSize: 11, color: '#475569', marginTop: 8, textAlign: 'center' }}>
              Save at least one quote above to proceed to checkout
            </p>
          )}
          {savedFiles.length > 0 && savedFiles.length < readyFiles.length && (
            <p style={{ fontSize: 11, color: '#fbbf24', marginTop: 8, textAlign: 'center' }}>
              {readyFiles.length - savedFiles.length} part{readyFiles.length - savedFiles.length > 1 ? 's' : ''} not yet saved — only saved parts will be ordered
            </p>
          )}
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <CheckoutModal
          quotes={checkoutQuotes}
          totalExVat={checkoutSubtotal}
          onClose={() => setShowCheckout(false)}
          onSuccess={handleOrderSuccess}
        />
      )}
    </div>
  );
}
