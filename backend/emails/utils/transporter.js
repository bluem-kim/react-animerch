const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

if (!host || !user || !pass) {
  // Do not throw here to avoid crashing the app without SMTP; we'll log once.
  // Email sends will fail gracefully if transporter isn't configured.
  console.warn('[mail] SMTP environment variables are not fully set.');
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // true for 465, false for others like 587
  auth: user && pass ? { user, pass } : undefined,
});

module.exports = transporter;
