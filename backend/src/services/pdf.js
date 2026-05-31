import PDFDocument from 'pdfkit';

export function generateQuotePdf({ order, items, user, address, res }) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  const subtotal = items.reduce((s, i) => s + Number(i.total_price), 0);
  const vat = subtotal * 0.20;
  const total = subtotal + vat;
  const fmt = (n) => `€${Number(n).toFixed(2)}`;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  // Colors
  const GREEN = '#22d3a5';
  const DARK = '#0f1117';
  const GRAY = '#64748b';
  const LIGHT = '#94a3b8';

  // Header band
  doc.rect(0, 0, doc.page.width, 80).fill(DARK);
  doc.fontSize(22).fillColor(GREEN).text('⚡ CutQuote', 50, 24);
  doc.fontSize(10).fillColor(LIGHT).text('Laser & Plasma Cutting Services', 50, 52);
  doc.fontSize(10).fillColor(LIGHT)
    .text(`Quote #${order.id.slice(0,8).toUpperCase()}`, 400, 28, { align: 'right', width: 145 })
    .text(dateStr, 400, 44, { align: 'right', width: 145 });

  doc.moveDown(3);

  // Two-column: bill to / quote details
  const col1 = 50, col2 = 320, y = 105;
  doc.fontSize(9).fillColor(GRAY).text('BILL TO', col1, y);
  doc.fontSize(11).fillColor('#e2e8f0')
    .text(user.name, col1, y + 14)
    .text(user.email, col1, y + 28);

  if (address?.street) {
    doc.fontSize(10).fillColor(LIGHT)
      .text(address.street, col1, y + 44)
      .text(`${address.city}, ${address.postal_code}`, col1, y + 58)
      .text(address.country, col1, y + 72);
  }

  doc.fontSize(9).fillColor(GRAY).text('QUOTE DETAILS', col2, y);
  doc.fontSize(10).fillColor(LIGHT)
    .text(`Date: ${dateStr}`, col2, y + 14)
    .text(`Valid until: ${validUntil}`, col2, y + 28)
    .text(`Method: ${items[0]?.cutting_method || '—'}`, col2, y + 42);

  // Divider
  const tableTop = address?.street ? 220 : 180;
  doc.moveTo(50, tableTop - 10).lineTo(doc.page.width - 50, tableTop - 10).strokeColor('#1e293b').stroke();

  // Table header
  doc.rect(50, tableTop, doc.page.width - 100, 22).fill('#1e293b');
  const cols = { file: 50, material: 230, thick: 310, qty: 370, price: 430, total: 495 };
  doc.fontSize(9).fillColor(GRAY);
  doc.text('FILE', cols.file + 4, tableTop + 7);
  doc.text('MATERIAL', cols.material, tableTop + 7);
  doc.text('THICK', cols.thick, tableTop + 7);
  doc.text('QTY', cols.qty, tableTop + 7);
  doc.text('UNIT', cols.price, tableTop + 7);
  doc.text('TOTAL', cols.total, tableTop + 7);

  // Table rows
  let rowY = tableTop + 26;
  items.forEach((item, i) => {
    if (i % 2 === 0) doc.rect(50, rowY - 4, doc.page.width - 100, 20).fill('#0f1117');
    doc.fontSize(9).fillColor('#e2e8f0').text(item.original_name?.replace('.dxf', '') || '—', cols.file + 4, rowY, { width: 170, ellipsis: true });
    doc.fillColor(LIGHT)
      .text(item.material?.replace('_', ' ') || '—', cols.material, rowY)
      .text(`${item.thickness_mm}mm`, cols.thick, rowY)
      .text(`${item.quantity}`, cols.qty, rowY)
      .text(fmt(item.unit_price), cols.price, rowY);
    doc.fillColor(GREEN).text(fmt(item.total_price), cols.total, rowY);
    rowY += 20;
  });

  // Totals block
  rowY += 10;
  doc.moveTo(50, rowY).lineTo(doc.page.width - 50, rowY).strokeColor('#1e293b').stroke();
  rowY += 14;

  const totalsX = 380;
  doc.fontSize(10).fillColor(LIGHT)
    .text('Subtotal (ex. VAT)', totalsX, rowY)
    .text(fmt(subtotal), 0, rowY, { align: 'right', width: doc.page.width - 50 });
  rowY += 18;
  doc.text('VAT (20%)', totalsX, rowY)
    .text(fmt(vat), 0, rowY, { align: 'right', width: doc.page.width - 50 });
  rowY += 10;
  doc.moveTo(totalsX, rowY).lineTo(doc.page.width - 50, rowY).strokeColor('#1e293b').stroke();
  rowY += 12;
  doc.fontSize(13).fillColor(GREEN)
    .text('Total inc. VAT', totalsX, rowY)
    .text(fmt(total), 0, rowY, { align: 'right', width: doc.page.width - 50 });

  // Footer
  const footerY = doc.page.height - 60;
  doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).strokeColor('#1e293b').stroke();
  doc.fontSize(9).fillColor(GRAY)
    .text('Thank you for your business.', 50, footerY + 10)
    .text('Questions? Contact us at ' + (process.env.ADMIN_EMAIL || 'info@cutquote.com'), 50, footerY + 24);

  doc.end();
}
