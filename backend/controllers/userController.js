const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const uploadBufferToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'users' }, (error, result) => {
      if (error) return reject(error);
      resolve({ url: result.secure_url, public_id: result.public_id });
    });
    stream.end(buffer);
  });

// POST /register
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'username, email, password required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already used' });

    let photo;
    if (req.file) {
      photo = await uploadBufferToCloudinary(req.file.buffer);
    }
    const user = await User.create({ username, email, password, photo });
    const token = signToken(user._id);
    res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email, photo: user.photo, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /auth/me
exports.me = async (req, res) => {
  try {
    // req.user is populated by auth middleware
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const user = req.user;
    res.json({ user: { id: user._id, username: user.username, email: user.email, photo: user.photo, role: user.role, active: user.active } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email, password required' });
    const user = await User.findOne({ email }).select('+password active role username email photo');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.active === false) return res.status(403).json({ message: 'Account is deactivated' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signToken(user._id);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, photo: user.photo, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ADMIN: list users
exports.adminListUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const q = (req.query.q || '').trim();
    const criteria = q
      ? { $or: [ { email: { $regex: q, $options: 'i' } }, { username: { $regex: q, $options: 'i' } } ] }
      : {};
    const [items, total] = await Promise.all([
      User.find(criteria)
        .select('username email role active createdAt photo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(criteria)
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ADMIN: update role
exports.adminUpdateRole = async (req, res) => {
  try {
    const id = req.params.id;
    const { role } = req.body || {};
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('username email role active');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ADMIN: update active status
exports.adminUpdateActive = async (req, res) => {
  try {
    const id = req.params.id;
    const { active } = req.body || {};
    if (typeof active !== 'boolean') return res.status(400).json({ message: 'active must be boolean' });
    const user = await User.findByIdAndUpdate(id, { active }, { new: true }).select('username email role active');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /user/profile
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (username) user.username = username;
    if (email) user.email = email;
    if (password) user.password = password; // will re-hash in pre save

    if (req.file) {
      try {
        if (user.photo?.public_id) {
          await cloudinary.uploader.destroy(user.photo.public_id);
        }
      } catch (_e) {}
      user.photo = await uploadBufferToCloudinary(req.file.buffer);
    }

    await user.save();
    res.json({ user: { id: user._id, username: user.username, email: user.email, photo: user.photo } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /login/firebase - accepts Firebase ID token; verifies and exchanges for backend JWT
exports.firebaseLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'idToken required' });

    const initFirebaseAdmin = require('../config/firebaseAdmin');
    const admin = initFirebaseAdmin();
    if (!admin) return res.status(500).json({ message: 'Firebase Admin not configured' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) return res.status(400).json({ message: 'Email not present in token' });

    let user = await User.findOne({ email });
    if (!user) {
      const username = decoded.name?.trim() || email.split('@')[0];
      // generate a random password to satisfy schema; never used for Firebase users
      const randomPassword = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      user = await User.create({
        email,
        username,
        password: randomPassword,
        photo: decoded.picture ? { url: decoded.picture } : undefined,
      });
    }
    if (user.active === false) return res.status(403).json({ message: 'Account is deactivated' });

    const token = signToken(user._id);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, photo: user.photo, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Invalid Firebase token' });
  }
};