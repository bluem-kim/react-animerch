import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Container, Box, TextField, Button, Card, CardMedia, CardContent, Typography, 
  Chip, CircularProgress, Grid, Paper, Select, MenuItem, FormControl, 
  IconButton, Skeleton, InputAdornment, Divider, Rating
} from '@mui/material';
import { ArrowForward, Search, FilterList, Visibility, AddShoppingCart } from '@mui/icons-material';
import { api } from '../utils/api';
import { useCart } from '../context/CartContext';
import { getColorValue, getContrastText } from '../utils/colors';

function Reveal({ children }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setShown(true);
      });
    }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      transition: 'opacity .4s ease, transform .4s ease',
      opacity: shown ? 1 : 0,
      transform: shown ? 'none' : 'translateY(10px)'
    }}>
      {children}
    </div>
  );
}

function ProductCard({ p }) {
  const cart = useCart();
  const img = p?.photos?.[0]?.url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop';
  const avg = Number(p?.ratingAvg || 0);
  const count = Number(p?.ratingCount || 0);
  return (
    <Reveal>
      <Card 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4
          }
        }}
      >
        <Box
          component={Link}
          to={`/p/${p._id}`}
          sx={{ 
            display: 'block',
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            height: 0,
            // Match Home Featured: 4/3 aspect ratio for consistency
            paddingBottom: '75%',
            flexShrink: 0,
            bgcolor: 'grey.100',
            '& img': {
              transition: 'transform 0.3s ease'
            },
            '&:hover img': {
              transform: 'scale(1.05)'
            }
          }}
        >
          <Box
            component="img"
            src={img}
            alt={p.name}
            loading="lazy"
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block'
            }}
          />
        </Box>
        <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 140 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
            <Typography variant="body2" fontWeight={500} noWrap sx={{ flexGrow: 1 }}>
              {p.name}
            </Typography>
            <Chip 
              label={`₱${Number(p.price).toFixed(2)}`} 
              size="small" 
              color="primary"
              sx={{ fontWeight: 600, flexShrink: 0 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '16px', height: 32 }}>
            {p.description || 'Beautiful hand-crafted item.'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Rating value={avg} precision={0.1} size="small" readOnly />
            <Typography variant="caption" color="text.secondary">({count})</Typography>
          </Box>
          <Typography variant="caption" sx={{ mb: 1, color: Number(p.stock) > 0 ? 'success.main' : 'error.main' }}>
            {Number(p.stock) > 0 ? `${Number(p.stock)} in stock` : 'Out of stock'}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', gap: 1 }}>
            <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
              {p.category || 'General'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <IconButton component={Link} to={`/p/${p._id}`} size="small" color="default" title="View">
                <Visibility fontSize="small" />
              </IconButton>
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<AddShoppingCart fontSize="small" />}
                disabled={Number(p.stock) <= 0}
                onClick={() => cart.add({ product: p._id, name: p.name, price: p.price, photoUrl: p?.photos?.[0]?.url, quantity: 1, stock: Number(p.stock) })}
                sx={{ fontSize: '0.72rem' }}
              >
                {Number(p.stock) > 0 ? 'Add to Cart' : 'Out of Stock'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Reveal>
  );
}

export default function Shop() {
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [q, setQ] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [minPrice, setMinPrice] = useState(params.get('min') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('max') || '');
  const [color, setColor] = useState(params.get('color') || '');
  const [minRating, setMinRating] = useState(params.get('rating') || '');
  const [sort, setSort] = useState(params.get('sort') || 'new'); // new, price-asc, price-desc

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cats, setCats] = useState([]);
  const [colors, setColors] = useState([]);

  const PAGE_LIMIT = 6;
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  const syncUrl = useCallback((next = {}) => {
    const sp = new URLSearchParams(location.search);
    const apply = (k, v) => { if (v) sp.set(k, v); else sp.delete(k); };
    apply('q', next.q ?? q);
    apply('category', next.category ?? category);
    apply('min', next.minPrice ?? minPrice);
    apply('max', next.maxPrice ?? maxPrice);
    apply('sort', next.sort ?? sort);
    apply('color', next.color ?? color);
    apply('rating', next.minRating ?? minRating);
    navigate(`/shop?${sp.toString()}`, { replace: true });
  }, [q, category, minPrice, maxPrice, sort, color, minRating, location.search, navigate]);

  const buildParams = (pageNum) => {
    const p = { page: pageNum, limit: PAGE_LIMIT, activeCategoriesOnly: true };
    if (q) p.search = q;
    if (category) p.category = category;
    if (minPrice) p.minPrice = Number(minPrice);
    if (maxPrice) p.maxPrice = Number(maxPrice);
    if (color) p.color = color;
    p.includeRatings = true;
    if (minRating) p.minRating = Number(minRating);
    // sort is client-side for now except createdAt (default desc)
    return p;
  };

  const fetchPage = useCallback(async (pageNum) => {
    const res = await api.get('/products', { params: buildParams(pageNum) });
    const batch = res.data.items || [];
    return { batch, totalPages: res.data.totalPages || 1 };
  }, [q, category, minPrice, maxPrice, color, minRating]);

  // Initial/filters change load
  useEffect(() => {
    let active = true;
    setLoading(true);
    setItems([]);
    setPage(1);
    setHasMore(true);
    (async () => {
      try {
        // Add a small delay to showcase loading state
        const [{ batch, totalPages }] = await Promise.all([
          fetchPage(1),
          sleep(800)
        ]);
        if (!active) return;
        setItems(batch);
        const more = typeof totalPages === 'number' ? 1 < totalPages : (batch.length === PAGE_LIMIT);
        setHasMore(more);
        // categories from first pages
        const catMap = new Map();
        const colorMap = new Map();
        batch.forEach(p => {
          const key = p.category || 'General';
          if (!catMap.has(key)) catMap.set(key, { name: key, count: 0 });
          catMap.get(key).count += 1;
          
          // Collect colors
          if (p.color && p.color.trim()) {
            const colorKey = p.color.trim();
            if (!colorMap.has(colorKey)) colorMap.set(colorKey, { name: colorKey, count: 0 });
            colorMap.get(colorKey).count += 1;
          }
        });
        setCats(Array.from(catMap.values()).sort((a,b)=>b.count-a.count));
        setColors(Array.from(colorMap.values()).sort((a,b)=>b.count-a.count));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [q, category, minPrice, maxPrice, color, minRating, fetchPage]);

  // Infinite scroll
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(async (entries) => {
      const e = entries[0];
      if (e.isIntersecting && !loadingMore && hasMore) {
        setLoadingMore(true);
        const next = page + 1;
        try {
          // Ensure the spinner shows for a moment for demo purposes
          const [{ batch, totalPages }] = await Promise.all([
            fetchPage(next),
            sleep(1200)
          ]);
          setItems((prev) => [...prev, ...batch]);
          setPage(next);
          const more = typeof totalPages === 'number' ? next < totalPages : (batch.length === PAGE_LIMIT);
          setHasMore(more);
        } finally {
          setLoadingMore(false);
        }
      }
    }, { rootMargin: '400px 0px', threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [page, hasMore, loadingMore, fetchPage]);

  // Client-side sort (for price)
  const sorted = useMemo(() => {
    if (sort === 'price-asc') return [...items].sort((a,b)=>Number(a.price)-Number(b.price));
    if (sort === 'price-desc') return [...items].sort((a,b)=>Number(b.price)-Number(a.price));
    return items; // 'new' relies on API default sorting
  }, [items, sort]);

  const clearFilters = () => {
    setQ(''); setCategory(''); setMinPrice(''); setMaxPrice(''); setColor(''); setMinRating(''); setSort('new');
    navigate('/shop', { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 3 }}>
      <Container maxWidth="lg" sx={{ px: 2 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Sidebar Filters */}
          <Box sx={{ width: 240, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                position: 'sticky', 
                top: 80,
                border: 1,
                borderColor: 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                <FilterList fontSize="small" color="action" />
                <Typography variant="caption" fontWeight={600}>
                  Filters
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 1.5 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* Search */}
                <TextField
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search"
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                    sx: {
                      // Avoid double focus (Tailwind outline + MUI outline)
                      '& .MuiInputBase-input': {
                        outline: 'none',
                        boxShadow: 'none',
                      },
                      '& .MuiInputBase-input:focus': {
                        outline: 'none',
                        boxShadow: 'none',
                      },
                    },
                  }}
                />

                {/* Category */}
                <Box>
                  <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ mb: 0.75, display: 'block', fontSize: '0.7rem' }}>
                    Category
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">All</MenuItem>
                      {cats.map(c => (
                        <MenuItem key={c.name} value={c.name}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Price Range */}
                <Box>
                  <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ mb: 0.75, display: 'block', fontSize: '0.7rem' }}>
                    Price
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
                    <TextField
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min"
                      type="number"
                      size="small"
                      inputProps={{ min: '0', step: '0.01' }}
                    />
                    <TextField
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max"
                      type="number"
                      size="small"
                      inputProps={{ min: '0', step: '0.01' }}
                    />
                  </Box>
                </Box>

                {/* Rating */}
                <Box>
                  <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ mb: 0.75, display: 'block', fontSize: '0.7rem' }}>
                    Rating
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={minRating}
                      onChange={(e) => setMinRating(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">All ratings</MenuItem>
                      <MenuItem value="4">4★ & up</MenuItem>
                      <MenuItem value="3">3★ & up</MenuItem>
                      <MenuItem value="2">2★ & up</MenuItem>
                      <MenuItem value="1">1★ & up</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Color */}
                <Box>
                  <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ mb: 0.75, display: 'block', fontSize: '0.7rem' }}>
                    Color
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    <Box
                      onClick={() => setColor('')}
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: 2,
                        borderColor: color === '' ? 'primary.main' : 'divider',
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        fontWeight: 600,
                        color: 'white',
                        transition: 'all 0.2s',
                        boxShadow: color === '' ? 2 : 0,
                        '&:hover': {
                          transform: 'scale(1.1)',
                          boxShadow: 2
                        }
                      }}
                      title="All Colors"
                    >
                      All
                    </Box>
                    {colors.map(c => {
                      const colorValue = getColorValue(c.name);
                      const isGradient = colorValue.startsWith('linear-gradient');
                      return (
                        <Box
                          key={c.name}
                          onClick={() => setColor(c.name)}
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            border: 2,
                            borderColor: color === c.name ? 'primary.main' : 'divider',
                            background: colorValue,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: color === c.name ? 2 : 0,
                            '&:hover': {
                              transform: 'scale(1.1)',
                              boxShadow: 2
                            }
                          }}
                          title={c.name}
                        />
                      );
                    })}
                  </Box>
                </Box>

                {/* Sort */}
                <Box>
                  <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ mb: 0.75, display: 'block', fontSize: '0.7rem' }}>
                    Sort
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <MenuItem value="new">Newest</MenuItem>
                      <MenuItem value="price-asc">Price: Low to High</MenuItem>
                      <MenuItem value="price-desc">Price: High to Low</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Divider />

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Button 
                    onClick={() => syncUrl({})} 
                    variant="contained" 
                    fullWidth
                    size="small"
                  >
                    Apply
                  </Button>
                  <Button 
                    onClick={clearFilters} 
                    variant="text" 
                    fullWidth
                    size="small"
                  >
                    Clear All
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Box>

          {/* Products Grid */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Products
            </Typography>
            
            <Grid container spacing={2.5} sx={{ mt: 1, width: '100%' }}>
              {loading ? (
                Array.from({ length: PAGE_LIMIT }).map((_, i) => (
                  <Grid size={{ xs: 12, sm: 4, md: 4, lg: 4, xl: 4 }} key={i}>
                    <Card sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <Box sx={{ width: '100%', height: 0, paddingBottom: '75%', position: 'relative', bgcolor: 'grey.100' }}>
                        <Skeleton variant="rectangular" sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                      </Box>
                      <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 140 }}>
                        <Skeleton variant="text" sx={{ height: 20 }} />
                        <Skeleton variant="text" width="60%" sx={{ height: 16 }} />
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : (
                sorted.map(p => (
                  <Grid size={{ xs: 12, sm: 4, md: 4, lg: 4, xl: 4 }} key={p._id}>
                    <ProductCard p={p} />
                  </Grid>
                ))
              )}
            </Grid>

            {/* Sentinel & status */}
            <div ref={sentinelRef} style={{ height: 48 }} />
            
            {loadingMore && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 1 }}>
                  <CircularProgress size={18} sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">Loading more…</Typography>
                </Box>
                <Grid container spacing={2.5} sx={{ mt: 0 }}>
                  {Array.from({ length: PAGE_LIMIT }).map((_, i) => (
                    <Grid size={{ xs: 12, sm: 4, md: 4, lg: 4, xl: 4 }} key={`sk-${i}`}>
                      <Card sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Box sx={{ width: '100%', height: 0, paddingBottom: '75%', position: 'relative', bgcolor: 'grey.100' }}>
                          <Skeleton variant="rectangular" sx={{ position: 'absolute', top: 0, left: 0, width: '100%,', height: '100%' }} />
                        </Box>
                        <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 140 }}>
                          <Skeleton variant="text" sx={{ height: 20 }} />
                          <Skeleton variant="text" width="60%" sx={{ height: 16 }} />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
            
            {!loading && !sorted.length && (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No products match your filters.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
