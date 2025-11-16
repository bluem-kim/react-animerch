const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  try {
    const uri = process.env.DB_URI;
    if (!uri) throw new Error('DB_URI not set in backend/.env');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const res = await User.updateMany({ active: { $exists: false } }, { $set: { active: true } });
    console.log(`Updated documents: ${res.modifiedCount || res.nModified || 0}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Backfill failed:', e.message || e);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
})();
