const express = require('express');
const auth = require('../middlewares/auth');
const { listCategories, getCategory, createCategory, updateCategory, deleteCategory, toggleCategory } = require('../controllers/categoryController');

const router = express.Router();

router.get('/categories', listCategories);
router.get('/categories/:id', getCategory);
router.post('/categories', auth, createCategory);
router.put('/categories/:id', auth, updateCategory);
router.delete('/categories/:id', auth, deleteCategory);
router.patch('/categories/:id/toggle', auth, toggleCategory);

module.exports = router;
