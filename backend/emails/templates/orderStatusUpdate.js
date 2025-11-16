function formatCurrency(amount) {
  const n = Number(amount || 0);
  return `₱${n.toFixed(2)}`;
}

function shortOrderId(id) {
  if (!id) return '';
  const s = String(id);
  return s.slice(-6).toUpperCase();
}

function titleForStatus(status) {
  switch (status) {
    case 'shipped':
      return 'Order Shipped';
    case 'completed':
      return 'Order Delivered';
    case 'cancelled':
      return 'Order Cancelled';
    default:
      return 'Order Update';
  }
}

function leadForStatus(status) {
  switch (status) {
    case 'shipped':
      return 'Good news! Your order is on the way.';
    case 'completed':
      return 'Your order has been delivered. We hope you enjoy it!';
    case 'cancelled':
      return 'Your order has been cancelled.';
    default:
      return 'There is an update regarding your order.';
  }
}

function buildOrderStatusUpdate({ user, transaction }) {
  const brand = process.env.BRAND_NAME || 'Animemerch';
  const orderNo = shortOrderId(transaction?._id);
  const title = titleForStatus(transaction?.status);
  const lead = leadForStatus(transaction?.status);
  const subject = `${brand} ${title} #${orderNo}`;

  const subtotal = Number(transaction?.totalAmount || 0);
  const greetingName = user?.username || user?.email || 'Customer';

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background:#f6f8fb; padding:24px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden;">
      <tr>
        <td style="padding:20px 24px; border-bottom:1px solid #eee;">
          <div style="font-size:18px; font-weight:700; color:#111;">${brand}</div>
          <div style="margin-top:4px; font-size:12px; color:#6b7280;">Order #${orderNo}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px 0; font-size:16px; color:#111;">Hi ${greetingName},</p>
          <p style="margin:0; color:#374151;">${lead}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 16px 24px;">
          <div style="margin-top:8px; font-size:14px; color:#374151;">
            <strong>Status:</strong> ${title}
          </div>
          <div style="margin-top:4px; font-size:14px; color:#374151;">
            <strong>Total:</strong> ${formatCurrency(subtotal)}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px; background:#f9fafb; border-top:1px solid #eee; font-size:12px; color:#6b7280;">
          Thank you for shopping with ${brand}.
        </td>
      </tr>
    </table>
    <div style="max-width:640px; margin:12px auto 0; text-align:center; font-size:11px; color:#9ca3af;">
      © ${new Date().getFullYear()} ${brand}
    </div>
  </div>`;

  const text = [
    `${brand} - Order #${orderNo}`,
    `${title}`,
    `Total: ${formatCurrency(subtotal)}`,
    '',
    `Thank you for shopping with ${brand}.`,
  ].join('\n');

  return { subject, html, text };
}

module.exports = { buildOrderStatusUpdate };
