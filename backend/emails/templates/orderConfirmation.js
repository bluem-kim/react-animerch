function formatCurrency(amount) {
  // Keep consistent with frontend: Peso with 2 decimals
  const n = Number(amount || 0);
  return `₱${n.toFixed(2)}`;
}

function shortOrderId(id) {
  if (!id) return '';
  const s = String(id);
  return s.slice(-6).toUpperCase();
}

function buildOrderConfirmation({ user, transaction }) {
  const brand = process.env.BRAND_NAME || 'Animemerch';
  const orderNo = shortOrderId(transaction?._id);
  const subject = `${brand} Order Confirmation #${orderNo}`;

  const itemsRows = (transaction?.items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding: 8px 0;">${it.name}</td>
        <td style="padding: 8px 0; text-align:center; color:#555;">× ${it.quantity}</td>
        <td style="padding: 8px 0; text-align:right; color:#111;">${formatCurrency(Number(it.price) * Number(it.quantity))}</td>
      </tr>`
    )
    .join('');

  const shippingBlock = transaction?.shippingAddress
    ? `
      <p style="margin: 0 0 4px 0;">${transaction.shippingAddress}</p>
      ${transaction.contactPhone ? `<p style=\"margin: 0; color:#555;\">${transaction.contactPhone}</p>` : ''}
    `
    : '<p style="margin:0; color:#555;">Provided at delivery</p>';

  const notesBlock = transaction?.notes
    ? `<p style="margin: 4px 0 0 0; color:#555;">Notes: ${transaction.notes}</p>`
    : '';

  const subtotal = Number(transaction?.totalAmount || 0);
  const shipping = 0;
  const total = subtotal + shipping;

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
          <p style="margin:0; color:#374151;">Thanks for your order. We’re preparing it for delivery. You’ll pay via Cash on Delivery.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 8px 24px;">
          <h3 style="margin:0 0 8px 0; font-size:16px; color:#111;">Order Summary</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            ${itemsRows}
            <tr>
              <td colspan="3" style="padding-top:8px; border-top:1px solid #eee;"></td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#555;">Subtotal</td>
              <td></td>
              <td style="padding:8px 0; text-align:right;">${formatCurrency(subtotal)}</td>
            </tr>
            <tr>
              <td style="padding:0 0 8px 0; color:#555;">Shipping</td>
              <td></td>
              <td style="padding:0 0 8px 0; text-align:right; color:#059669;">Free</td>
            </tr>
            <tr>
              <td style="padding:8px 0; border-top:1px solid #eee; font-weight:700;">Total</td>
              <td style="border-top:1px solid #eee;"></td>
              <td style="padding:8px 0; border-top:1px solid #eee; text-align:right; font-weight:700; color:#111;">${formatCurrency(total)}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 24px 20px 24px;">
          <h3 style="margin:0 0 8px 0; font-size:16px; color:#111;">Shipping To</h3>
          ${shippingBlock}
          ${notesBlock}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px; background:#f9fafb; border-top:1px solid #eee; font-size:12px; color:#6b7280;">
          You’ll receive another email when your order ships.
        </td>
      </tr>
    </table>
    <div style="max-width:640px; margin:12px auto 0; text-align:center; font-size:11px; color:#9ca3af;">
      © ${new Date().getFullYear()} ${brand}
    </div>
  </div>`;

  const textLines = [];
  textLines.push(`${brand} - Order #${orderNo}`);
  textLines.push(`Hi ${greetingName}, thanks for your order.`);
  textLines.push('');
  textLines.push('Items:');
  (transaction?.items || []).forEach((it) => {
    textLines.push(`- ${it.name} x ${it.quantity} = ${formatCurrency(Number(it.price) * Number(it.quantity))}`);
  });
  textLines.push(`Subtotal: ${formatCurrency(subtotal)}`);
  textLines.push('Shipping: Free');
  textLines.push(`Total: ${formatCurrency(total)}`);
  textLines.push('');
  textLines.push('Ship to:');
  if (transaction?.shippingAddress) textLines.push(transaction.shippingAddress);
  if (transaction?.contactPhone) textLines.push(transaction.contactPhone);
  if (transaction?.notes) textLines.push(`Notes: ${transaction.notes}`);

  const text = textLines.join('\n');

  return { subject, html, text };
}

module.exports = { buildOrderConfirmation };
