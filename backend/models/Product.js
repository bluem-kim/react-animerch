const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, required: true }
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, trim: true, index: true },
  color: { type: String, trim: true, index: true },
  description: { type: String },
  stock: { type: Number, default: 0, min: 0 },
  photos: { type: [photoSchema], default: [] },
  deleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
