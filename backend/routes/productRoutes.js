const express = require('express');
const multer = require('multer');
const { createProduct, getProducts, getProductById, updateProduct, deleteProduct, bulkDeleteProducts, restoreProduct, purgeProducts, purgeProduct } = require('../controllers/productController');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/products', upload.array('photos', 8), createProduct);
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.put('/products/:id', upload.array('photos', 8), updateProduct);
router.delete('/products/:id', deleteProduct);
router.delete('/products', bulkDeleteProducts);
router.put('/products/:id/restore', restoreProduct);
router.delete('/products/purge', purgeProducts);
router.delete('/products/:id/purge', purgeProduct);

module.exports = router;
