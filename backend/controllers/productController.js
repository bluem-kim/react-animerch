const Product = require('../models/Product');
const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');

const uploadBufferToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'products' }, (error, result) => {
      if (error) return reject(error);
      resolve({ url: result.secure_url, public_id: result.public_id });
    });
    stream.end(buffer);
  });

// POST /products
exports.createProduct = async (req, res) => {
  try {
    const { name, price, category, description, color, stock } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ message: 'name, price, category required' });
    }
    const uploads = req.files?.length ? await Promise.all(req.files.map(f => uploadBufferToCloudinary(f.buffer))) : [];
    const initialStock = Number(stock);
    const product = await Product.create({ name, price, category, description, color, photos: uploads, ...(Number.isFinite(initialStock) && initialStock >= 0 ? { stock: initialStock } : {}) });
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /products?search=&category=&minPrice=&maxPrice=&page=&limit=&activeCategoriesOnly=&minRating=&includeRatings=
exports.getProducts = async (req, res) => {
  try {
    const { search, category, color, minPrice, maxPrice, page = 1, limit = 10, deleted, activeCategoriesOnly, minRating, includeRatings } = req.query;
    const query = {};
    if (deleted === 'true') query.deleted = true; else query.deleted = false;
    if (search) query.name = { $regex: search, $options: 'i' };
    if (category) query.category = category;
    if (color) query.color = color;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    // Exclude products from inactive categories when requested (user/shop side)
    if (activeCategoriesOnly === 'true') {
      const activeCategoryNames = await Category.find({ isActive: true }).distinct('name');
      if (Array.isArray(activeCategoryNames) && activeCategoryNames.length) {
        if (query.category) {
          // If a specific category is requested, ensure it's active; otherwise, force no results
          if (!activeCategoryNames.includes(query.category)) {
            // Set an impossible condition to return 0 results
            query.category = '__INACTIVE__SHOULD_RETURN_NONE__';
          }
        } else {
          query.category = { $in: activeCategoryNames };
        }
      } else {
        // No active categories -> return empty
        query.category = '__NO_ACTIVE_CATEGORIES__';
      }
    }
    const skip = (Number(page) - 1) * Number(limit);

    const minRatingNum = Number(minRating);
    const useRatingFilter = Number.isFinite(minRatingNum) && minRatingNum > 0;
    const wantRatings = String(includeRatings).toLowerCase() === 'true' || includeRatings === '1';

    if (!useRatingFilter && !wantRatings) {
      // Fast-path: original query without rating join
      const [items, total] = await Promise.all([
        Product.find(query).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
        Product.countDocuments(query)
      ]);
      return res.json({ items, page: Number(page), total, totalPages: Math.ceil(total / Number(limit)) });
    }

    // With rating filter: aggregate with approved reviews
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'reviews',
          let: { pid: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$product', '$$pid'] }, { $eq: ['$approved', true] } ] } } },
            { $project: { rating: 1 } },
          ],
          as: 'rv',
        },
      },
      {
        $addFields: {
          ratingCount: { $size: '$rv' },
          ratingAvg: {
            $cond: [ { $gt: [ { $size: '$rv' }, 0 ] }, { $avg: '$rv.rating' }, 0 ],
          },
        },
      },
      ...(useRatingFilter ? [ { $match: { ratingAvg: { $gte: minRatingNum } } } ] : []),
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          items: [ { $skip: skip }, { $limit: Number(limit) }, { $project: { rv: 0 } } ],
          count: [ { $count: 'total' } ],
        },
      },
    ];

    const agg = await Product.aggregate(pipeline);
    const items = (agg[0]?.items) || [];
    const total = (agg[0]?.count?.[0]?.total) || 0;
    return res.json({ items, page: Number(page), total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /products/:id
exports.getProductById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !require('mongoose').isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }
    const doc = await Product.findById(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /products/:id
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !require('mongoose').isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }
    const { name, price, category, description, color, stock } = req.body;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Not found' });

    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;
    if (color !== undefined) product.color = color;
    if (stock !== undefined) {
      const nextStock = Number(stock);
      if (!Number.isFinite(nextStock) || nextStock < 0) {
        return res.status(400).json({ message: 'stock must be a non-negative number' });
      }
      product.stock = nextStock;
    }

    // Parse keepPhotoIds from body (can be JSON string or array)
    let keepPhotoIds = undefined;
    if (req.body.keepPhotoIds !== undefined) {
      if (Array.isArray(req.body.keepPhotoIds)) {
        keepPhotoIds = req.body.keepPhotoIds;
      } else {
        try {
          // support JSON string or comma-separated
          const raw = req.body.keepPhotoIds;
          keepPhotoIds = raw.trim().startsWith('[') ? JSON.parse(raw) : raw.split(',').map(s => s.trim()).filter(Boolean);
        } catch (_e) {
          keepPhotoIds = [];
        }
      }
    }

    // Start with kept existing photos
    let nextPhotos = product.photos;
    if (keepPhotoIds) {
      const toRemove = product.photos.filter(p => !keepPhotoIds.includes(p.public_id));
      nextPhotos = product.photos.filter(p => keepPhotoIds.includes(p.public_id));
      // Attempt to delete removed photos from Cloudinary (best-effort)
      if (toRemove.length) {
        try {
          await Promise.allSettled(toRemove.map(p => cloudinary.uploader.destroy(p.public_id)));
        } catch (_err) {
          // ignore errors during cleanup
        }
      }
    }

    // Handle newly uploaded files
    if (req.files && req.files.length) {
      const uploads = await Promise.all(req.files.map(f => uploadBufferToCloudinary(f.buffer)));
      nextPhotos = [...nextPhotos, ...uploads];
    }

    product.photos = nextPhotos;
    const saved = await product.save();
    res.json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /products/:id
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(id, { deleted: true, deletedAt: new Date() }, { new: true });
    if (!product) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Moved to trash' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /products (bulk)
exports.bulkDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids array required' });
    await Product.updateMany({ _id: { $in: ids } }, { $set: { deleted: true, deletedAt: new Date() } });
    res.json({ message: 'Moved to trash', count: ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /products/:id/restore
exports.restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Product.findByIdAndUpdate(id, { deleted: false, $unset: { deletedAt: 1 } }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Restored', product: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /products/purge (bulk hard delete)
exports.purgeProducts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids array required' });
    // Best-effort Cloudinary cleanup for all matched products
    try {
      const docs = await Product.find({ _id: { $in: ids } }).select('photos');
      const publicIds = [];
      for (const d of docs) {
        const photos = Array.isArray(d.photos) ? d.photos : [];
        for (const p of photos) {
          if (p?.public_id) publicIds.push(p.public_id);
        }
      }
      if (publicIds.length) {
        await Promise.allSettled(publicIds.map((pid) => require('../config/cloudinary').uploader.destroy(pid)));
      }
    } catch (_e) {
      // ignore media cleanup errors; proceed with DB purge
    }
    await Product.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Purged', count: ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /products/:id/purge (single hard delete)
exports.purgeProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !require('mongoose').isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }
    const doc = await Product.findById(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    // Best-effort: cleanup photos from Cloudinary
    try {
      const photos = Array.isArray(doc.photos) ? doc.photos : [];
      if (photos.length) {
        await Promise.allSettled(photos.map(p => require('../config/cloudinary').uploader.destroy(p.public_id)));
      }
    } catch (_) {}
    await doc.deleteOne();
    res.json({ message: 'Purged', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
