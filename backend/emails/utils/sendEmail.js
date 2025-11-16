const transporter = require('./transporter');

async function sendEmail({ to, subject, html, text, bcc, attachments }) {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
  const fromName = process.env.BRAND_NAME || 'Animemerch';
  const defaultBcc = process.env.ORDERS_BCC;

  if (!to) throw new Error('sendEmail: missing to');
  if (!subject) throw new Error('sendEmail: missing subject');

  // If transporter wasn't configured, this will likely error; let caller catch.
  return transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to,
    bcc: bcc || defaultBcc,
    subject,
    text,
    html,
    attachments,
  });
}

module.exports = { sendEmail };
