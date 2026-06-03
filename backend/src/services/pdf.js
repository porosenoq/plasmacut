import PDFDocument from 'pdfkit';

export function generateQuotePdf({ order, items, user, address, res }) {
  const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });
  doc.pipe(res);

  const subtotal = items.reduce((s, i) => s + Number(i.total_price), 0);
  const vat = subtotal * 0.20;
  const total = subtotal + vat;
  const fmt = (n) => `\u20AC${Number(n).toFixed(2)}`;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const GREEN  = '#1a9e7a';
  const DARK   = '#1e293b';
  const WHITE  = '#ffffff';
  const BLACK  = '#0f172a';
  const DGRAY  = '#334155';
  const MGRAY  = '#64748b';
  const LGRAY  = '#f1f5f9';  // light grey row bg
  const WROW   = '#ffffff';  // white row bg
  const PW     = doc.page.width;

  // ── Header band ──────────────────────────────────────────────
  doc.rect(0, 0, PW, 72).fill(DARK);
  doc.fontSize(20).fillColor(GREEN).text('CutQuote', 50, 20);
  doc.fontSize(9).fillColor('#94a3b8').text('Laser & Plasma Cutting Services', 50, 46);
  doc.fontSize(9).fillColor('#94a3b8')
    .text(`Quote #${order.id.slice(0,8).toUpperCase()}`, 0, 22, { align: 'right', width: PW - 50 })
    .text(dateStr, 0, 36, { align: 'right', width: PW - 50 });

  // ── Bill to / Quote details ───────────────────────────────────
  const col1 = 50, col2 = 320, infoY = 90;

  doc.fontSize(7).fillColor(MGRAY).text('BILL TO', col1, infoY);
  doc.fontSize(11).fillColor(BLACK).text(user?.name || '', col1, infoY + 12);
  doc.fontSize(9).fillColor(DGRAY).text(user?.email || '', col1, infoY + 26);
  if (address?.street) {
    doc.fontSize(9).fillColor(DGRAY)
      .text(address.street, col1, infoY + 40)
      .text(`${address.city}, ${address.postal_code}`, col1, infoY + 53)
      .text(address.country, col1, infoY + 66);
  }

  doc.fontSize(7).fillColor(MGRAY).text('QUOTE DETAILS', col2, infoY);
  doc.fontSize(9).fillColor(DGRAY)
    .text(`Date: ${dateStr}`, col2, infoY + 12)
    .text(`Valid until: ${validUntil}`, col2, infoY + 25)
    .text(`Cutting method: ${items[0]?.cutting_method || '—'}`, col2, infoY + 38)
    .text(`Order #${order.id.slice(0,8).toUpperCase()}`, col2, infoY + 51);

  // ── Divider ───────────────────────────────────────────────────
  const tableTop = address?.street ? 210 : 170;
  doc.moveTo(50, tableTop - 8).lineTo(PW - 50, tableTop - 8).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

  // ── Table header ──────────────────────────────────────────────
  const ROW_H = 22;
  const cols = { file: 54, material: 224, thick: 304, qty: 358, price: 412, total: 490 };

  doc.rect(50, tableTop, PW - 100, ROW_H).fill(DARK);
  doc.fontSize(8).fillColor('#94a3b8');
  doc.text('FILE / PART', cols.file, tableTop + 7);
  doc.text('MATERIAL',    cols.material, tableTop + 7);
  doc.text('THICK',       cols.thick,    tableTop + 7);
  doc.text('QTY',         cols.qty,      tableTop + 7);
  doc.text('UNIT',        cols.price,    tableTop + 7);
  doc.text('TOTAL',       cols.total,    tableTop + 7);

  // ── Table rows (alternating white / light grey, dark text) ────
  let rowY = tableTop + ROW_H;
  items.forEach((item, i) => {
    const rowBg = i % 2 === 0 ? WROW : LGRAY;
    doc.rect(50, rowY, PW - 100, ROW_H).fill(rowBg);

    // dark text on light background
    doc.fontSize(8).fillColor(BLACK)
      .text(item.original_name?.replace('.dxf','') || '—', cols.file, rowY + 7, { width: 162, ellipsis: true });
    doc.fillColor(DGRAY)
      .text((item.material?.replace('_',' ') || '—'), cols.material, rowY + 7, { width: 72 })
      .text(`${item.thickness_mm}mm`,  cols.thick, rowY + 7)
      .text(`${item.quantity}`,         cols.qty,   rowY + 7)
      .text(fmt(item.unit_price),       cols.price, rowY + 7);
    doc.fillColor(GREEN)
      .text(fmt(item.total_price), cols.total, rowY + 7);

    rowY += ROW_H;
  });

  // thin border under table
  doc.moveTo(50, rowY).lineTo(PW - 50, rowY).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

  // ── Totals ────────────────────────────────────────────────────
  rowY += 12;
  const totX = 360;
  const totW = PW - 50;

  doc.fontSize(9).fillColor(DGRAY)
    .text('Subtotal (ex. VAT)', totX, rowY)
    .text(fmt(subtotal), 0, rowY, { align: 'right', width: totW });
  rowY += 16;
  doc.text('VAT (20%)', totX, rowY)
    .text(fmt(vat), 0, rowY, { align: 'right', width: totW });
  rowY += 10;
  doc.moveTo(totX, rowY).lineTo(PW - 50, rowY).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
  rowY += 10;
  doc.fontSize(12).fillColor(GREEN)
    .text('Total inc. VAT', totX, rowY)
    .text(fmt(total), 0, rowY, { align: 'right', width: totW });

  rowY += 32;

  // ── Footer — placed right after totals, not at page bottom ───
  doc.moveTo(50, rowY).lineTo(PW - 50, rowY).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
  rowY += 10;
  doc.fontSize(8).fillColor(MGRAY)
    .text('Thank you for your business.', 50, rowY)
    .text('Questions? Contact us at ' + (process.env.ADMIN_EMAIL || 'info@cutquote.com'), 50, rowY + 14);

  doc.end();
}
