import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'quotes@cutquote.com';
const ADMIN = process.env.ADMIN_EMAIL || '';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function formatCurrency(amount) {
  return `€${Number(amount).toFixed(2)}`;
}

function orderItemsHtml(items) {
  return items.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#e2e8f0">${item.original_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#94a3b8;text-align:center">${item.cutting_method}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#94a3b8;text-align:center">${item.material?.replace('_',' ')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#94a3b8;text-align:center">${item.thickness_mm}mm</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#94a3b8;text-align:center">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#22d3a5;text-align:right">${formatCurrency(item.total_price)}</td>
    </tr>
  `).join('');
}

function baseTemplate(content) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="margin-bottom:24px">
      <span style="font-size:22px;font-weight:700;color:#f8fafc">⚡ CutQuote</span>
    </div>
    <div style="background:#151a25;border:1px solid #1e293b;border-radius:12px;overflow:hidden">
      ${content}
    </div>
    <div style="margin-top:20px;font-size:12px;color:#334155;text-align:center">
      CutQuote · Laser & Plasma Cutting Services
    </div>
  </div>
</body>
</html>`;
}

// --- Customer: order confirmation ---
export async function sendOrderConfirmation({ order, items, user, address }) {
  if (!process.env.RESEND_API_KEY) return;
  const subtotal = items.reduce((s, i) => s + Number(i.total_price), 0);
  const vat = subtotal * 0.20;
  const total = subtotal + vat;

  const html = baseTemplate(`
    <div style="padding:24px 28px;border-bottom:1px solid #1e293b">
      <h1 style="font-size:20px;font-weight:600;color:#f8fafc;margin:0 0 6px">Order confirmed ✓</h1>
      <p style="font-size:14px;color:#64748b;margin:0">Order #${order.id.slice(0,8).toUpperCase()} has been received and is pending confirmation.</p>
    </div>
    <div style="padding:24px 28px">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px">
        <thead>
          <tr style="background:#0f1117">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#475569;font-weight:500">File</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#475569;font-weight:500">Method</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#475569;font-weight:500">Material</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#475569;font-weight:500">Thickness</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#475569;font-weight:500">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#475569;font-weight:500">Price</th>
          </tr>
        </thead>
        <tbody>${orderItemsHtml(items)}</tbody>
      </table>

      <div style="background:#0f1117;border-radius:8px;padding:14px 16px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#64748b;margin-bottom:6px">
          <span>Subtotal (ex. VAT)</span><span>${formatCurrency(subtotal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#64748b;margin-bottom:8px">
          <span>VAT (20%)</span><span>${formatCurrency(vat)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:700;color:#22d3a5;border-top:1px solid #1e293b;padding-top:10px">
          <span>Total inc. VAT</span><span>${formatCurrency(total)}</span>
        </div>
      </div>

      <div style="background:#0f1117;border-radius:8px;padding:14px 16px;margin-bottom:20px">
        <div style="font-size:12px;color:#64748b;margin-bottom:8px">Delivery address</div>
        <div style="font-size:13px;color:#e2e8f0;line-height:1.6">
          ${address.name}<br>
          ${address.street}<br>
          ${address.city}, ${address.postal_code}<br>
          ${address.country}${order.phone ? '<br>Tel: ' + order.phone : ''}
        </div>
      </div>

      <p style="font-size:13px;color:#64748b;margin:0">We'll be in touch shortly to confirm your order and provide a production timeline. You can track your order status at <a href="${APP_URL}/orders" style="color:#22d3a5">${APP_URL}/orders</a>.</p>
    </div>
  `);

  await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: `Order confirmed #${order.id.slice(0,8).toUpperCase()} — CutQuote`,
    html,
  });
}

// --- Admin: new order alert ---
export async function sendAdminOrderAlert({ order, items, user, address }) {
  if (!process.env.RESEND_API_KEY || !ADMIN) return;
  const subtotal = items.reduce((s, i) => s + Number(i.total_price), 0);
  const total = subtotal * 1.20;

  const html = baseTemplate(`
    <div style="padding:24px 28px;border-bottom:1px solid #1e293b">
      <h1 style="font-size:20px;font-weight:600;color:#f8fafc;margin:0 0 6px">🔔 New order received</h1>
      <p style="font-size:14px;color:#64748b;margin:0">Order #${order.id.slice(0,8).toUpperCase()} from ${user.name} (${user.email})</p>
    </div>
    <div style="padding:24px 28px">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px">
        <thead>
          <tr style="background:#0f1117">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#475569;font-weight:500">File</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#475569;font-weight:500">Method</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#475569;font-weight:500">Material</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#475569;font-weight:500">Thickness</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#475569;font-weight:500">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#475569;font-weight:500">Price</th>
          </tr>
        </thead>
        <tbody>${orderItemsHtml(items)}</tbody>
      </table>
      <div style="font-size:16px;font-weight:700;color:#22d3a5;margin-bottom:16px">Total: ${formatCurrency(total)} inc. VAT</div>
      <div style="background:#0f1117;border-radius:8px;padding:14px 16px;margin-bottom:16px">
        <div style="font-size:12px;color:#64748b;margin-bottom:6px">Ship to</div>
        <div style="font-size:13px;color:#e2e8f0;line-height:1.6">
          ${address.name}<br>${address.street}<br>${address.city}, ${address.postal_code}<br>${address.country}${order.phone ? '<br>Tel: ' + order.phone : ''}
        </div>
      </div>
      <a href="${APP_URL}/admin/orders/${order.id}" style="display:inline-block;padding:10px 20px;background:#22d3a5;color:#0f1117;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none">View in admin →</a>
    </div>
  `);

  await resend.emails.send({
    from: FROM,
    to: ADMIN,
    subject: `New order #${order.id.slice(0,8).toUpperCase()} — ${formatCurrency(total)}`,
    html,
  });
}

// --- Customer: order status update ---
export async function sendStatusUpdate({ order, user, newStatus }) {
  if (!process.env.RESEND_API_KEY) return;

  const statusMessages = {
    confirmed:     { emoji: '✅', title: 'Order confirmed', body: 'Your order has been confirmed and will enter production shortly.' },
    in_production: { emoji: '⚙️', title: 'In production', body: 'Your parts are currently being cut. We\'ll notify you when they\'re shipped.' },
    shipped:       { emoji: '🚚', title: 'Order shipped', body: 'Your order is on its way! You should receive it within the estimated delivery window.' },
    delivered:     { emoji: '📦', title: 'Order delivered', body: 'Your order has been marked as delivered. Thank you for choosing CutQuote!' },
    cancelled:     { emoji: '❌', title: 'Order cancelled', body: 'Your order has been cancelled. Please contact us if you have any questions.' },
  };

  const msg = statusMessages[newStatus];
  if (!msg) return;

  const html = baseTemplate(`
    <div style="padding:24px 28px;border-bottom:1px solid #1e293b">
      <h1 style="font-size:20px;font-weight:600;color:#f8fafc;margin:0 0 6px">${msg.emoji} ${msg.title}</h1>
      <p style="font-size:14px;color:#64748b;margin:0">Order #${order.id.slice(0,8).toUpperCase()}</p>
    </div>
    <div style="padding:24px 28px">
      <p style="font-size:14px;color:#94a3b8;margin:0 0 20px">${msg.body}</p>
      <a href="${APP_URL}/orders" style="display:inline-block;padding:10px 20px;background:#22d3a5;color:#0f1117;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none">Track your order →</a>
    </div>
  `);

  await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: `${msg.emoji} ${msg.title} — Order #${order.id.slice(0,8).toUpperCase()}`,
    html,
  });
}

// --- Customer: provider claimed your order ---
export async function sendProviderClaimedNotice({ order, items, customer, provider }) {
  if (!process.env.RESEND_API_KEY) return;
  const subtotal = items.reduce((s, i) => s + Number(i.total_price), 0);

  const html = baseTemplate(`
    <div style="padding:24px 28px;border-bottom:1px solid #1e293b">
      <h1 style="font-size:20px;font-weight:600;color:#f8fafc;margin:0 0 6px">A provider has accepted your order</h1>
      <p style="font-size:14px;color:#64748b;margin:0">Order #${order.id.slice(0,8).toUpperCase()} is now confirmed and will go into production.</p>
    </div>
    <div style="padding:24px 28px">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px">
        <tbody>${orderItemsHtml(items)}</tbody>
      </table>
      <div style="font-size:14px;font-weight:600;color:#22d3a5;margin-bottom:16px">Total: ${formatCurrency(subtotal * 1.20)} inc. VAT</div>
      <a href="${APP_URL}/orders" style="display:inline-block;padding:10px 20px;background:#22d3a5;color:#0f1117;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none">Track your order &rarr;</a>
    </div>
  `);

  await resend.emails.send({
    from: FROM,
    to: customer.email,
    subject: `Your order is confirmed - #${order.id.slice(0,8).toUpperCase()}`,
    html,
  });
}
