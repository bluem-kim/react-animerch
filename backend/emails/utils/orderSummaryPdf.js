const PDFDocument = require('pdfkit');

function formatCurrency(n) {
  const value = Number(n || 0);
  const locale = process.env.BRAND_LOCALE || 'en-PH';
  try {
    const formatted = value.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `PHP ${formatted}`;
  } catch {
    return `PHP ${value.toFixed(2)}`;
  }
}

function buildOrderSummaryPdf({ user, transaction, brand = {} }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const brandName = brand.name || process.env.BRAND_NAME || 'Animemerch';
      const brandSupport = brand.support || process.env.SUPPORT_EMAIL || 'support@example.com';

      // Header
      doc
        .fontSize(20)
        .text(brandName, { align: 'left' })
        .moveDown(0.3)
        .fontSize(10)
        .fillColor('#666')
        .text(`Order Summary (Invoice)`, { align: 'left' })
        .text(`Order ID: ${transaction?._id}`, { align: 'left' })
        .text(`Date: ${new Date(transaction?.createdAt || Date.now()).toLocaleString()}`, { align: 'left' })
        .text(`Status: ${String(transaction?.status || '')}`)
        .moveDown();

      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke();
      doc.moveDown();

      // Customer & Shipping
      doc
        .fillColor('#000')
        .fontSize(12)
        .text('Customer', { continued: true })
        .fontSize(12)
        .text('     Shipping', { align: 'left' })
        .moveDown(0.4)
        .fontSize(10)
        .fillColor('#333')
        .text(`${user?.username || ''} <${user?.email || ''}>`)
        .moveDown(0.4)
        .text(`${transaction?.shippingAddress || 'N/A'}`)
        .moveDown(0.2)
        .text(`Contact: ${transaction?.contactPhone || 'N/A'}`)
        .moveDown();

      // Items table header
      const startY = doc.y + 10;
      doc
        .fontSize(11)
        .fillColor('#000')
        .text('Item', 50, startY, { width: 260 })
        .text('Qty', 320, startY, { width: 50, align: 'right' })
        .text('Unit', 380, startY, { width: 80, align: 'right' })
        .text('Subtotal', 470, startY, { width: 75, align: 'right' });
      doc.moveTo(50, startY + 15).lineTo(545, startY + 15).strokeColor('#ddd').stroke();

      let y = startY + 25;
      const items = Array.isArray(transaction?.items) ? transaction.items : [];
      doc.fontSize(10).fillColor('#333');
      for (const it of items) {
        const name = it?.name || 'Item';
        const qty = Number(it?.quantity || 0);
        const unit = Number(it?.price || 0);
        const subtotal = qty * unit;

        doc.text(name, 50, y, { width: 260 });
        doc.text(String(qty), 320, y, { width: 50, align: 'right' });
        doc.text(formatCurrency(unit), 380, y, { width: 80, align: 'right' });
        doc.text(formatCurrency(subtotal), 470, y, { width: 75, align: 'right' });
        y += 18;

        if (y > 740) {
          doc.addPage();
          y = 60;
        }
      }

      // Totals
      if (y > 680) {
        doc.addPage();
        y = 60;
      }
      doc.moveTo(50, y + 5).lineTo(545, y + 5).strokeColor('#ddd').stroke();
      y += 15;

      const totalAmount = Number(transaction?.totalAmount || 0);
      doc.fontSize(11).fillColor('#000');
      doc.text('Total', 380, y, { width: 80, align: 'right' });
      doc.text(formatCurrency(totalAmount), 470, y, { width: 75, align: 'right' });
      y += 20;

      // Notes
      if (transaction?.notes) {
        doc.moveDown().fontSize(11).fillColor('#000').text('Notes');
        doc.fontSize(10).fillColor('#333').text(String(transaction.notes), { width: 495 });
        y = doc.y;
      }

      // Footer
      if (y > 720) {
        doc.addPage();
      }
      doc.moveDown(2);
      doc.fontSize(9).fillColor('#666').text(`Thank you for shopping with ${brandName}. For support, contact ${brandSupport}.`, { align: 'center' });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { buildOrderSummaryPdf };
