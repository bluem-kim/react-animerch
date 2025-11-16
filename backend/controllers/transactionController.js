const mongoose = require('mongoose');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { sendEmail } = require('../emails/utils/sendEmail');
const { buildOrderConfirmation } = require('../emails/templates/orderConfirmation');
const { buildOrderStatusUpdate } = require('../emails/templates/orderStatusUpdate');
const { buildOrderSummaryPdf } = require('../emails/utils/orderSummaryPdf');

// Build items from product ids to avoid trusting client prices
async function buildItemsFromClient(itemsInput) {
  if (!Array.isArray(itemsInput) || !itemsInput.length) {
    const err = new Error('items array required');
    err.status = 400;
    throw err;
  }
  const productIds = itemsInput.map(i => i.product).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds }, deleted: { $ne: true } }).select('name price photos stock');
  const productMap = new Map(products.map(p => [String(p._id), p]));
  const items = [];
  for (const raw of itemsInput) {
    const qty = Number(raw.quantity || 0);
    const pid = String(raw.product || '');
    if (!productMap.has(pid) || qty < 1) {
      const err = new Error('invalid item in cart');
      err.status = 400;
      throw err;
    }
    const p = productMap.get(pid);
    if (Number(p.stock) < qty) {
      const err = new Error(`Insufficient stock for ${p.name}`);
      err.status = 409;
      throw err;
    }
    items.push({
      product: p._id,
      name: p.name,
      quantity: qty,
      price: p.price,
    });
  }
  return items;
}

exports.createTransaction = async (req, res) => {
  try {
    const { items: itemsInput, shippingAddress, contactPhone, notes } = req.body;
    const items = await buildItemsFromClient(itemsInput);
    const totalAmount = items.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0);

    // Perform stock decrement and order creation in a DB transaction for consistency
    const session = await mongoose.startSession();
    let doc;
    await session.withTransaction(async () => {
      // Decrement stock per item, ensuring sufficient stock remains
      for (const it of items) {
        const res = await Product.updateOne(
          { _id: it.product, stock: { $gte: it.quantity }, deleted: { $ne: true } },
          { $inc: { stock: -it.quantity } },
          { session }
        );
        if (res.matchedCount !== 1 || res.modifiedCount !== 1) {
          const err = new Error(`Insufficient stock for ${it.name}`);
          err.status = 409;
          throw err;
        }
      }

      doc = await Transaction.create([
        {
          user: req.user._id,
          items,
          totalAmount,
          paymentMethod: 'cod',
          shippingAddress,
          contactPhone,
          notes,
          status: 'pending',
        },
      ], { session });
      doc = Array.isArray(doc) ? doc[0] : doc;
    });
    session.endSession();
    // Fire-and-forget email; do not block response
    // Use microtask to ensure response path is not delayed
    (typeof queueMicrotask === 'function' ? queueMicrotask : setImmediate)(async () => {
      try {
        const { subject, html, text } = buildOrderConfirmation({ user: req.user, transaction: doc });
        await sendEmail({ to: req.user.email, subject, html, text });
      } catch (e) {
        console.error('[mail] order confirmation failed:', e?.message || e);
      }
    });

    res.status(201).json({ message: 'Order placed', transaction: doc });
  } catch (err) {
    const code = err.status || 500;
    res.status(code).json({ message: err.message || 'Server error' });
  }
};

exports.getMyTransactions = async (req, res) => {
  try {
    const list = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ items: list });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ADMIN: list all transactions (basic pagination)
exports.listTransactions = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Transaction.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments({}),
    ]);
    // Fetch user info for each transaction (lean approach)
    const userIds = [...new Set(items.map((t) => String(t.user)))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('username email')
      .lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const enriched = items.map((t) => ({
      ...t,
      userInfo: userMap.get(String(t.user)) || null,
    }));
    res.json({ items: enriched, total, page, limit });
  } catch (err) {
    console.error('listTransactions error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ADMIN: update transaction status and notify user
exports.updateTransactionStatus = async (req, res) => {
  try {
    const id = req.params.id;
    let { status } = req.body || {};
    if (!status) return res.status(400).json({ message: 'status required' });

    // Map friendly statuses to schema values
    const map = { delivered: 'completed' };
    status = map[status] || status;

    const allowed = new Set(['shipped', 'completed', 'cancelled']);
    if (!allowed.has(status)) return res.status(400).json({ message: 'invalid status' });

    const tx = await Transaction.findById(id);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });

    // Guard some transitions
    if (tx.status === 'cancelled' || tx.status === 'completed') {
      return res.status(400).json({ message: `Cannot change a ${tx.status} order` });
    }
    // Enforce delivered/completed only after shipped
    if (status === 'completed' && tx.status !== 'shipped') {
      return res.status(400).json({ message: 'Cannot mark delivered before order is shipped' });
    }

    // If cancelling, atomically restock items and update status in a DB transaction
    if (status === 'cancelled') {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const txDoc = await Transaction.findById(id).session(session);
          if (!txDoc) throw new Error('Transaction not found');
          if (txDoc.status === 'cancelled' || txDoc.status === 'completed') {
            const err = new Error(`Cannot change a ${txDoc.status} order`);
            err.status = 400;
            throw err;
          }
          // Restock each item
          for (const it of txDoc.items) {
            await Product.updateOne(
              { _id: it.product },
              { $inc: { stock: Number(it.quantity || 0) } },
              { session }
            );
          }
          txDoc.status = 'cancelled';
          await txDoc.save({ session });
          // Reflect in outer scope
          tx.status = txDoc.status;
        });
      } finally {
        session.endSession();
      }
    } else {
      tx.status = status;
      await tx.save();
    }

    // Email notify user (best-effort)
    let emailSent = false;
    try {
      const user = await User.findById(tx.user).select('username email');
      if (user?.email) {
        const { subject, html, text } = buildOrderStatusUpdate({ user, transaction: tx });
        let attachments;
        if (tx.status === 'completed') {
          try {
            const pdf = await buildOrderSummaryPdf({ user, transaction: tx });
            attachments = [
              {
                filename: `order-${String(tx._id)}.pdf`,
                content: pdf,
                contentType: 'application/pdf',
              },
            ];
          } catch (e) {
            console.error('[pdf] generation failed:', e?.message || e);
          }
        }
        await sendEmail({ to: user.email, subject, html, text, attachments });
        emailSent = true;
      }
    } catch (e) {
      console.error('[mail] status update failed:', e?.message || e);
    }

    res.json({ message: 'Status updated', transaction: tx, emailSent });
  } catch (err) {
    console.error('updateTransactionStatus error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ADMIN: aggregated sales stats with date range and granularity (month|day)
exports.getSalesStats = async (req, res) => {
  try {
    const granularity = (req.query.granularity || 'month').toLowerCase();
    // Parse start/end; default to current year range
    const now = new Date();
    const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
    const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
    let start = req.query.start ? new Date(req.query.start) : defaultStart;
    let end = req.query.end ? new Date(req.query.end) : defaultEnd;

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid start or end date' });
    }
    if (start > end) {
      return res.status(400).json({ message: 'start must be before end' });
    }

    // Normalize to UTC day bounds: [start 00:00:00.000, end 23:59:59.999]
    start = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0));
    end = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));

    // Build group stage based on granularity
    const dateField = '$createdAt';
    const projectUTC = {
      year: { $year: dateField },
      month: { $month: dateField },
      day: { $dayOfMonth: dateField },
    };

    let groupId;
    let sortStage;
    if (granularity === 'day') {
      groupId = { y: projectUTC.year, m: projectUTC.month, d: projectUTC.day };
      sortStage = { '_id.y': 1, '_id.m': 1, '_id.d': 1 };
    } else {
      groupId = { y: projectUTC.year, m: projectUTC.month };
      sortStage = { '_id.y': 1, '_id.m': 1 };
    }

    const pipeline = [
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: groupId,
          totalAmount: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: sortStage },
    ];

    const rows = await Transaction.aggregate(pipeline);

    const items = rows.map((r) => {
      const y = r._id.y;
      const m = String(r._id.m).padStart(2, '0');
      if (granularity === 'day') {
        const d = String(r._id.d).padStart(2, '0');
        return {
          label: `${y}-${m}-${d}`,
          year: y,
          month: r._id.m,
          day: r._id.d,
          totalAmount: r.totalAmount,
          orders: r.orders,
        };
      }
      return {
        label: `${y}-${m}`,
        year: y,
        month: r._id.m,
        totalAmount: r.totalAmount,
        orders: r.orders,
      };
    });

    res.json({ items, start, end, granularity });
  } catch (err) {
    console.error('getSalesStats error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
