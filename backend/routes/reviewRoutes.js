const express = require('express');
const { getReviews, deleteReview, createReview, approveReview, getEligibility, getMyReview, updateReview, getMyReviews } = require('../controllers/reviewController');
const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/requireAdmin');

const router = express.Router();

router.get('/reviews', getReviews);
router.get('/reviews/eligibility', auth, getEligibility);
router.get('/reviews/mine', auth, getMyReview);
router.get('/reviews/my', auth, getMyReviews);
router.post('/reviews', auth, createReview);
router.patch('/reviews/:id/approve', auth, requireAdmin, approveReview);
router.patch('/reviews/:id', auth, updateReview);
router.delete('/reviews/:id', auth, requireAdmin, deleteReview);

module.exports = router;
