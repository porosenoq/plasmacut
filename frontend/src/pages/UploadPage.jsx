import React, { useState, useRef } from 'react';
import { api } from '../lib/api.js';
import { usePrefs } from '../lib/prefs.jsx';
import FileQuoteRow from '../components/FileQuoteRow.jsx';
import CheckoutModal from '../components/CheckoutModal.jsx';

const VAT_RATE = 0.20;

export default function UploadPage() {
  const { t, colors } = usePrefs();
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
      name: f.name, file: null, svgContent: null, pricing: null,
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
        setFiles(prev => prev.map(f => f.id === pid ? { ...f, file: res.file, svgContent: res.parsed?.svg_content ?? null, loading: false } : f));
      } catch (e) {
        setFiles(prev => prev.map(f => f.id === pid ? { ...f, loading: false, error: e.message } : f));
      }
    });
  };

  const updatePricing = (pid, p) => setFiles(prev => prev.map(f => f.id === pid ? { ...f, pricing: p } : f));
  const updateForm = (pid, form) => setFiles(prev => prev.map(f => f.id === pid ? { ...f, form } : f));
  const removeFile = (pid) => setFiles(prev => prev.filter(f => f.id !== pid));
  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); };

  const readyFiles = files.filter(f => f.pricing && !f.loading && !f.error);
  const pendingFiles = files.filter(f => f.loading);
  const subtotal = readyFiles.reduce((sum, f) => sum + (f.pricing?.total_ex_vat ?? 0), 0);
  const vatAmount = subtotal * VAT_RATE;
  const grandTotal = subtotal + vatAmount;
  const canCheckout = readyFiles.length > 0 && pendingFiles.length === 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: colors.text, marginBottom: 6 }}>{t('uploadTitle')}</h1>
        <p style={{ fontSize: 14, color: colors.textMuted }}>{t('uploadSubtitle')}</p>
      </div>

      {completedOrder && (
        <div style={{ background: colors.bg, border: `1px solid #166534`, borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#4ade80' }}>{'\u2713'} {t('orderPlaced')}</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Order #{completedOrder.id.slice(0,8).toUpperCase()}</div>
          </div>
          <a href="/orders" style={{ fontSize: 13, color: colors.accent, textDecoration: 'none', background: colors.accentBg, padding: '6px 14px', borderRadius: 6 }}>{t('trackOrder')} {'\u2192'}</a>
        </div>
      )}

      {/* Step 1 */}
      <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: colors.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{t('step1')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 480 }}>
          {[['laser', '🔥', t('laserCutting'), t('laserDesc')], ['plasma', '⚡', t('plasmaCutting'), t('plasmaDesc')]].map(([val, icon, name, desc]) => (
            <button key={val} onClick={() => setMethod(val)} style={{ padding: '12px 14px', borderRadius: 8, textAlign: 'left', cursor: 'pointer', border: `1px solid ${method === val ? colors.accent : colors.border}`, background: method === val ? colors.accentBg : colors.inputBg }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 2 }}>{name}</div>
              <div style={{ fontSize: 11, color: colors.textMuted, lineHeight: 1.4 }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: colors.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{t('step2')}</div>
        <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${dragging ? colors.accent : colors.border}`, borderRadius: 12, padding: '28px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? colors.accentBg : 'transparent', transition: 'all 0.15s' }}>
          <input ref={inputRef} type="file" accept=".dxf" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          <div style={{ fontSize: 28, marginBottom: 8 }}>📐</div>
          <p style={{ fontSize: 14, fontWeight: 500, color: colors.text, marginBottom: 4 }}>{t('dropFiles')}</p>
          <p style={{ fontSize: 12, color: colors.textFaint }}>{t('multipleFiles')}</p>
        </div>
      </div>

      {/* Step 3 */}
      {files.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: colors.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{t('step3')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {files.map(entry => (
              <FileQuoteRow key={entry.id} entry={entry} method={method}
                onPricing={p => updatePricing(entry.id, p)}
                onFormChange={f => updateForm(entry.id, f)}
                onRemove={() => removeFile(entry.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {files.length > 0 && (
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 14 }}>{t('orderSummary')}</div>
          {readyFiles.length > 0 ? (
            <>
              {readyFiles.map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: `1px solid ${colors.bg}`, color: colors.textMuted }}>
                  <span style={{ color: colors.textSecondary }}>{f.file?.original_name} <span style={{ fontSize: 11 }}>{'\u00d7'} {f.form.quantity}</span></span>
                  <span>{'\u20AC'}{f.pricing.total_ex_vat}</span>
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                {[[t('subtotalExVat'), `\u20AC${subtotal.toFixed(2)}`], [t('vat'), `\u20AC${vatAmount.toFixed(2)}`]].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: colors.textMuted }}><span>{l}</span><span>{v}</span></div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, padding: '10px 0 0', color: colors.text, borderTop: `1px solid ${colors.border}`, marginTop: 6 }}>
                  <span>{t('totalIncVat')}</span><span style={{ color: colors.accent }}>{'\u20AC'}{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: colors.textFaint, textAlign: 'center', padding: '12px 0' }}>
              {pendingFiles.length > 0 ? t('waitingFiles') : t('configureAbove')}
            </div>
          )}
          <button onClick={() => setShowCheckout(true)} disabled={!canCheckout} style={{
            width: '100%', marginTop: 16, padding: '12px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600,
            cursor: canCheckout ? 'pointer' : 'not-allowed',
            background: canCheckout ? colors.accent : colors.bgTertiary,
            color: canCheckout ? (colors.bg === '#f1f5f9' ? '#fff' : '#0f1117') : colors.textFaint,
          }}>
            {pendingFiles.length > 0 ? t('waitingUploads') : t('proceedCheckout') + ' \u2192'}
          </button>
        </div>
      )}

      {showCheckout && (
        <CheckoutModal files={readyFiles} method={method} totalExVat={subtotal}
          onClose={() => setShowCheckout(false)}
          onSuccess={r => { setShowCheckout(false); setCompletedOrder(r.order); setFiles([]); }} />
      )}
    </div>
  );
}
