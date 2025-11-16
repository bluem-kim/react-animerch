const Category = require('../models/Category');

// GET /categories - List all categories (optionally filter by active status)
exports.listCategories = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const filter = activeOnly === 'true' ? { isActive: true } : {};
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json({ categories, total: categories.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /categories/:id - Get single category
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /categories - Create category (admin only)
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    
    const existing = await Category.findOne({ name: name.trim() });
    if (existing) return res.status(409).json({ message: 'Category already exists' });

    const category = await Category.create({ name: name.trim(), description: description?.trim() });
    res.status(201).json({ category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /categories/:id - Update category (admin only)
exports.updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    if (name && name.trim() !== category.name) {
      const existing = await Category.findOne({ name: name.trim(), _id: { $ne: req.params.id } });
      if (existing) return res.status(409).json({ message: 'Category name already exists' });
      category.name = name.trim();
    }
    
    if (description !== undefined) category.description = description?.trim();
    
    await category.save();
    res.json({ category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /categories/:id - Delete category (admin only)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /categories/:id/toggle - Toggle active status (admin only)
exports.toggleCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    
    category.isActive = !category.isActive;
    await category.save();
    res.json({ category, message: category.isActive ? 'Category activated' : 'Category deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
