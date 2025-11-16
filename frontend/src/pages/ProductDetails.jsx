import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useTGAlert } from '../components/TGAlert';
import { useCart } from '../context/CartContext';
import { getColorValue } from '../utils/colors';

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const alert = useTGAlert();
  const cart = useCart();
  const [openReviews, setOpenReviews] = useState(false);
  const [revLoading, setRevLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [revPage, setRevPage] = useState(1);
  const [revHasMore, setRevHasMore] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myReviewId, setMyReviewId] = useState(null);

  useEffect(() => {
    let activeReq = true;
    (async () => {
      try {
        const res = await api.get(`/products/${id}`);
        if (activeReq) setProduct(res.data);
      } catch (_e) {
        if (activeReq) setProduct(null);
      } finally {
        if (activeReq) setLoading(false);
      }
    })();
    return () => { activeReq = false; };
  }, [id]);

  const images = useMemo(() => {
    const fallbacks = [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1520975922299-5c8a2c6d7d88?q=80&w=1600&auto=format&fit=crop',
    ];
    const urls = (product?.photos || []).map(p => p.url).filter(Boolean);
    return urls.length ? urls : fallbacks;
  }, [product]);

  const addToCart = async () => {
    if (!product) return;
    const photoUrl = (product.photos && product.photos[0]?.url) || images[0];
    cart.add({ product: product._id, name: product.name, price: product.price, photoUrl, quantity: 1, stock: Number(product.stock) });
    await alert.alert('Added to cart', { variant: 'success' });
  };

  const fetchReviews = async (page) => {
    setRevLoading(true);
    try {
      const res = await api.get('/reviews', { params: { product: id, page, limit: 10, public: true } });
      const items = res.data?.items || [];
      setReviews((prev) => (page === 1 ? items : [...prev, ...items]));
      const totalPages = res.data?.totalPages || 1;
      setRevHasMore(page < totalPages);
      setRevPage(page);
    } finally {
      setRevLoading(false);
    }
  };

  const openReviewModal = async () => {
    setOpenReviews(true);
    setReviews([]);
    setRevPage(1);
    setRevHasMore(true);
    setRating(0);
    setComment('');
    setMyReviewId(null);
    try {
      try {
        const elig = await api.get('/reviews/eligibility', { params: { product: id } });
        setCanReview(!!elig.data?.canReview);
        setAlreadyReviewed(!!elig.data?.alreadyReviewed);
      } catch (_) {
        setCanReview(false);
        setAlreadyReviewed(false);
      }
      // If already reviewed, fetch my existing review to allow editing
      try {
        const resMine = await api.get('/reviews/mine', { params: { product: id } });
        const mine = resMine.data || null;
        if (mine && mine._id) {
          setMyReviewId(mine._id);
          setRating(Number(mine.rating) || 0);
          setComment(mine.comment || '');
        }
      } catch (_) {}
      await fetchReviews(1);
    } catch (_) {}
  };

  const submitReview = async () => {
    if (!rating) return alert.alert('Please select a rating', { variant: 'warning' });
    setSubmitting(true);
    try {
      if (myReviewId) {
        await api.patch(`/reviews/${myReviewId}`, { rating, comment });
        await alert.alert('Review updated (pending approval)', { variant: 'success' });
      } else {
        await api.post('/reviews', { product: id, rating, comment });
        await alert.alert('Review submitted for approval', { variant: 'success' });
      }
      setCanReview(false);
      setAlreadyReviewed(true);
      setRating(0);
      setComment('');
      setMyReviewId(null);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to submit review';
      await alert.alert(msg, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          <div className="space-y-4">
            <div className="h-7 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-5 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-24 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-10 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="text-2xl font-semibold text-gray-900 dark:text-white">Product not found</div>
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">It may have been removed or is unavailable.</div>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700">Back to Home</Link>
      </div>
    );
  }

  return (
    <>
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:text-gray-900 dark:hover:text-gray-200">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/products" className="hover:text-gray-900 dark:hover:text-gray-200">Products</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700 dark:text-gray-300">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="aspect-square bg-gray-50 dark:bg-gray-800">
              <img src={images[active]} alt={product.name} className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {images.map((src, idx) => (
              <button
                key={idx}
                onClick={() => setActive(idx)}
                className={`overflow-hidden rounded border ${active === idx ? 'border-indigo-500' : 'border-gray-200 dark:border-gray-800'}`}
              >
                <img src={src} alt="thumb" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{product.name}</h1>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">₱{Number(product.price).toFixed(2)}</span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">{product.category || 'General'}</span>
          </div>
          {product.color && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Color:</span>
              <div 
                className="h-6 w-6 rounded-full border-2 border-gray-300 dark:border-gray-600" 
                style={{ background: getColorValue(product.color) }}
                title={product.color}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{product.color}</span>
            </div>
          )}
          <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{product.description || 'A well-crafted product to enhance your daily life.'}</p>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={addToCart}
              disabled={product.stock <= 0}
              className={`inline-flex items-center justify-center rounded-md px-5 py-2.5 text-white shadow ${product.stock > 0 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <button onClick={openReviewModal} className="inline-flex items-center justify-center rounded-md border border-gray-300 px-5 py-2.5 text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Reviews</button>
          </div>

          <ul className="mt-8 grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`} /> 
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Free shipping over ₱50</li>
          </ul>
        </div>
      </div>
    </div>
    {/* Reviews Modal */}
    {openReviews && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={() => setOpenReviews(false)} />
        <div className="relative z-10 mx-4 w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h3 className="text-base font-semibold">Reviews</h3>
            <button onClick={() => setOpenReviews(false)} className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
            {/* Write review */}
            <div className="mb-5 rounded-md border border-gray-200 p-3 dark:border-gray-800">
              {canReview || alreadyReviewed ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} onClick={() => setRating(n)} className="text-2xl" title={`${n} star${n>1?'s':''}`}>
                        <span className={n <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}>★</span>
                      </button>
                    ))}
                    <span className="text-sm text-gray-500">{rating ? `${rating}/5` : 'Select rating'}</span>
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e)=> setComment(e.target.value)}
                    placeholder="Share your thoughts (optional)"
                    maxLength={800}
                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{myReviewId ? 'Changes require admin approval again.' : 'Your review will be visible after admin approval.'}</span>
                    <button disabled={submitting} onClick={submitReview} className={`rounded-md bg-indigo-600 px-4 py-2 text-sm text-white shadow ${submitting ? 'opacity-60' : 'hover:bg-indigo-700'}`}>{submitting ? 'Saving…' : (myReviewId ? 'Save Changes' : 'Submit Review')}</button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {alreadyReviewed ? 'You already submitted a review for this product.' : 'Only customers who purchased this product can review.'}
                </div>
              )}
            </div>

            {/* Reviews list */}
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r._id} className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-yellow-400">
                        {'★★★★★'.slice(0, Math.max(0, r.rating))}
                        <span className="text-gray-300 dark:text-gray-600">{'★★★★★'.slice(r.rating)}</span>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-gray-500">{r.user?.name || r.user?.email || 'User'}</div>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{r.comment}</p>}
                </div>
              ))}
              {!revLoading && reviews.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">No reviews yet.</div>
              )}
              {revLoading && (
                <div className="py-3 text-center text-sm text-gray-500">Loading…</div>
              )}
              {revHasMore && !revLoading && (
                <div className="flex justify-center py-2">
                  <button onClick={() => fetchReviews(revPage + 1)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">Load more</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
