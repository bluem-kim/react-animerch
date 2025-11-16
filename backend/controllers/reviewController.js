const Review = require('../models/Review');
const Transaction = require('../models/Transaction');

// Patterns to sanitize (will be masked with asterisks)
const SANITIZE_PATTERNS = [
  /fuck/gi,
  /shit/gi,
  /bitch/gi,
  /asshole/gi,
  /\bfag\b/gi,
  /\bdamn\b/gi,
  /https?:\/\/[^\s]+/gi,
  /\bwww\.[^\s]+/gi
];

function maskMatch(match) {
  return '*'.repeat(match.length);
}

function sanitizeText(text = '') {
  if (!text || typeof text !== 'string') return '';
  return SANITIZE_PATTERNS.reduce((acc, re) => acc.replace(re, maskMatch), text);
}

// GET /reviews?product=&page=&limit=
exports.getReviews = async (req, res) => {
  try {
    const { product, page = 1, limit = 10, public: isPublic, approvedOnly, me } = req.query;
    const query = {};
    if (product) query.product = product;
    if (String(isPublic) === 'true' || String(approvedOnly) === 'true') query.approved = true;
    if (String(me) === 'true' && req.user?._id) query.user = req.user._id;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Review.find(query).populate('product', 'name').populate('user', 'name email').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Review.countDocuments(query)
    ]);
    res.json({ items, page: Number(page), total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /reviews/mine?product=
exports.getMyReview = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { product } = req.query;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!product) return res.status(400).json({ message: 'Product is required' });
    const doc = await Review.findOne({ product, user: userId });
    if (!doc) return res.json(null);
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /reviews/my
exports.getMyReviews = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: 'Unauthorized' });
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const userId = req.user._id;
    const [items, total] = await Promise.all([
      Review.find({ user: userId }).populate('product', 'name').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Review.countDocuments({ user: userId })
    ]);
    res.json({ items, page: Number(page), total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /reviews
exports.createReview = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { product, rating, comment } = req.body || {};
    if (!product) return res.status(400).json({ message: 'Product is required' });
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });

    const text = typeof comment === 'string' ? String(comment).trim() : '';
    if (text.length > 800) return res.status(400).json({ message: 'Comment too long (max 800 chars)' });
    const sanitized = sanitizeText(text);

    const purchased = await Transaction.exists({
      user: userId,
      status: { $in: ['paid', 'shipped', 'completed'] },
      'items.product': product
    });
    if (!purchased) return res.status(403).json({ message: 'You can review only after purchase' });

    const existing = await Review.findOne({ product, user: userId });
    if (existing) return res.status(400).json({ message: 'You have already reviewed this product' });

    const doc = await Review.create({ product, user: userId, rating: r, comment: sanitized || undefined, approved: false });
    res.status(201).json({ message: 'Review submitted for approval', review: doc });
  } catch (err) {
    // Handle unique index race
    if (err && err.code === 11000) return res.status(400).json({ message: 'You have already reviewed this product' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /reviews/:id/approve
exports.approveReview = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Review.findByIdAndUpdate(id, { $set: { approved: true } }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Approved', review: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /reviews/:id
exports.updateReview = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    const { rating, comment } = req.body || {};
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    const text = typeof comment === 'string' ? String(comment).trim() : '';
    if (text.length > 800) return res.status(400).json({ message: 'Comment too long (max 800 chars)' });
    const sanitized = sanitizeText(text);
    const doc = await Review.findById(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const isOwner = String(doc.user) === String(userId);
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });
    doc.rating = r;
    doc.comment = sanitized || undefined;
    // Re-approval required on edit unless admin approves separately
    doc.approved = false;
    await doc.save();
    res.json({ message: 'Updated (pending approval)', review: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /reviews/eligibility?product=
exports.getEligibility = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { product } = req.query;
    if (!product) return res.status(400).json({ message: 'Product is required' });
    if (!userId) return res.json({ canReview: false, alreadyReviewed: false });

    const purchased = await Transaction.exists({
      user: userId,
      status: { $in: ['paid', 'shipped', 'completed'] },
      'items.product': product
    });
    const alreadyReviewed = !!(await Review.exists({ product, user: userId }));
    res.json({ canReview: !!purchased && !alreadyReviewed, alreadyReviewed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /reviews/:id
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Review.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
