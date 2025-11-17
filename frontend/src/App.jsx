import { Link, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { toggleTheme, getPreferredTheme } from './utils/theme';
import './App.css';
import Home from './pages/Home';
const ProductList = lazy(() => import('./pages/products/ProductList'));
const ProductCreate = lazy(() => import('./pages/products/ProductCreate'));
const ProductEdit = lazy(() => import('./pages/products/ProductEdit'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const Reviews = lazy(() => import('./pages/reviews/Reviews'));
const Trash = lazy(() => import('./pages/products/Trash'));
const Transactions = lazy(() => import('./pages/admin/Transactions'));
const Users = lazy(() => import('./pages/admin/Users'));
const CategoryList = lazy(() => import('./pages/categories/CategoryList'));
const CategoryForm = lazy(() => import('./pages/categories/CategoryForm'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Shop = lazy(() => import('./pages/Shop'));
import AuthModal from './components/AuthModal';
import { CartProvider } from './context/CartContext';
const Checkout = lazy(() => import('./pages/Checkout'));
const Profile = lazy(() => import('./pages/auth/Profile'));
import Navbar from './components/Navbar';
import { api } from './utils/api';
import { auth } from './utils/firebase';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Avatar,
  Chip,
  useMediaQuery,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Container,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Category as CategoryIcon,
  Inventory as InventoryIcon,
  Add as AddIcon,
  Reviews as ReviewsIcon,
  Delete as DeleteIcon,
  Brightness4,
  Brightness7
} from '@mui/icons-material';
import { Person as PersonIcon } from '@mui/icons-material';
import { signOut } from 'firebase/auth';

export default function App() {
  const [mode, setMode] = useState('light');
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState('login');
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authToast, setAuthToast] = useState({ open: false, msg: '', severity: 'success' });
  
  useEffect(() => { setMode(getPreferredTheme()); }, []);
  const { checkSession } = useSession(setUser);
  useEffect(() => {
    let active = true;
    (async () => { setChecking(true); await checkSession(); if (active) setChecking(false); })();
    return () => { active = false; };
  }, [checkSession]);
  useEffect(() => {
    if (!authOpen) {
      (async () => { setChecking(true); await checkSession(); setChecking(false); })();
    }
  }, [authOpen, checkSession]);

  // Listen for global auth events (login/logout) to refresh session and toast
  useEffect(() => {
    const onAuthEvent = async (e) => {
      const type = e?.detail?.type;
      const reason = e?.detail?.reason;
      if (type === 'login') {
        setAuthToast({ open: true, msg: 'Signed in successfully.', severity: 'success' });
        setChecking(true); await checkSession(); setChecking(false);
      } else if (type === 'logout') {
        let msg = 'You have been signed out.';
        let severity = 'info';
        if (reason === 'deactivated') {
          msg = 'Your account has been deactivated. You have been signed out.';
          severity = 'warning';
        } else if (reason === 'expired') {
          msg = 'Your session expired. Please sign in again.';
          severity = 'warning';
        }
        setAuthToast({ open: true, msg, severity });
        try { await signOut(auth()); } catch (_) {}
        try { localStorage.removeItem('token'); } catch (_) {}
        setUser(null);
      }
    };
    window.addEventListener('app:auth', onAuthEvent);
    return () => { window.removeEventListener('app:auth', onAuthEvent); };
  }, [checkSession, setUser]);

  // Open auth modal on demand (e.g., when protected routes require login)
  useEffect(() => {
    const onOpen = (e) => {
      const view = e?.detail?.view || 'login';
      setAuthView(view);
      setAuthOpen(true);
    };
    window.addEventListener('app:auth-open', onOpen);
    return () => { window.removeEventListener('app:auth-open', onOpen); };
  }, []);
  
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isDark = mode === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const isAdminLayout = pathname.startsWith('/admin');
  const isMobile = useMediaQuery('(max-width:900px)');

  const muiTheme = createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: '#6366f1',
      },
    },
  });

  const drawerWidth = 260;

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
    { divider: true, label: 'CATALOG' },
    { text: 'Categories', icon: <CategoryIcon />, path: '/admin/categories' },
    { text: 'Products', icon: <InventoryIcon />, path: '/admin/products' },
    { text: 'Add Product', icon: <AddIcon />, path: '/admin/products/new' },
    { divider: true, label: 'MANAGEMENT' },
    { text: 'Users', icon: <PersonIcon />, path: '/admin/users' },
    { text: 'Reviews', icon: <ReviewsIcon />, path: '/admin/reviews' },
    { text: 'Trash', icon: <DeleteIcon />, path: '/admin/trash' },
    { divider: true, label: 'ORDERS' },
    { text: 'Orders', icon: <InventoryIcon />, path: '/admin/transactions' },
  ];

  const drawer = (
    <Box>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <svg style={{ width: 32, height: 32, color: '#6366f1' }} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
        </svg>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>animerch</Typography>
          <Typography variant="caption" color="text.secondary">Admin Panel</Typography>
        </Box>
      </Box>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        {menuItems.map((item, index) => {
          if (item.divider) {
            return (
              <ListItem key={index} sx={{ pt: 2, pb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', px: 2 }}>
                  {item.label}
                </Typography>
              </ListItem>
            );
          }
          const isActive = item.path === '/admin' ? pathname === '/admin' : pathname.startsWith(item.path);
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isActive}
                sx={{
                  borderRadius: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
  if (isAdminLayout) {
    if (checking) {
      return (
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <CircularProgress />
          </Box>
        </ThemeProvider>
      );
    }
    if (!user) {
      return <Navigate to="/" replace state={{ notice: 'auth' }} />;
    }
    if (user.role !== 'admin') {
      return <Navigate to="/" replace state={{ notice: 'not_admin' }} />;
    }
    return (
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <Box sx={{ display: 'flex' }}>
          <AppBar
            position="fixed"
            sx={{
              width: { sm: `calc(100% - ${drawerWidth}px)` },
              ml: { sm: `${drawerWidth}px` },
              backgroundColor: isDark ? 'background.paper' : 'white',
              color: 'text.primary',
              boxShadow: 1,
            }}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setMobileOpen(!mobileOpen)}
                sx={{ mr: 2, display: { sm: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
              <Box sx={{ flexGrow: 1 }} />
              <IconButton onClick={() => setMode(toggleTheme())} sx={{ mr: 1 }}>
                {isDark ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
              {user && (
                <Chip
                  avatar={<Avatar src={user.photo?.url}>{!user.photo?.url && user.username?.[0]?.toUpperCase()}</Avatar>}
                  label={user.username || 'User'}
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Toolbar>
          </AppBar>
          <Box
            component="nav"
            sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          >
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={() => setMobileOpen(false)}
              ModalProps={{ keepMounted: true }}
              sx={{
                display: { xs: 'block', sm: 'none' },
                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
              }}
            >
              {drawer}
            </Drawer>
            <Drawer
              variant="permanent"
              sx={{
                display: { xs: 'none', sm: 'block' },
                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
              }}
              open
            >
              {drawer}
            </Drawer>
          </Box>
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              width: { sm: `calc(100% - ${drawerWidth}px)` },
              mt: 8,
            }}
          >
            <Suspense fallback={
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
                <CircularProgress />
              </Box>
            }>
              <Routes>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/categories" element={<CategoryList />} />
                <Route path="/admin/categories/create" element={<CategoryForm />} />
                <Route path="/admin/categories/edit/:id" element={<CategoryForm />} />
                <Route path="/admin/products" element={<ProductList />} />
                <Route path="/admin/products/new" element={<ProductCreate />} />
                <Route path="/admin/products/:id/edit" element={<ProductEdit />} />
                <Route path="/admin/reviews" element={<Reviews />} />
                <Route path="/admin/users" element={<Users />} />
                <Route path="/admin/transactions" element={<Transactions />} />
                <Route path="/admin/trash" element={<Trash />} />
              </Routes>
            </Suspense>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  // Storefront layout for home and non-admin pages
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <CartProvider>
        <RouteNotice />
        <Snackbar
          open={authToast.open}
          autoHideDuration={3500}
          onClose={() => setAuthToast((t) => ({ ...t, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setAuthToast((t) => ({ ...t, open: false }))} severity={authToast.severity} sx={{ width: '100%' }}>
            {authToast.msg}
          </Alert>
        </Snackbar>
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar
            onToggleTheme={() => setMode(toggleTheme())}
            isDark={isDark}
            onAuthOpen={(view) => { setAuthView(view); setAuthOpen(true); }}
            user={user}
            onLogout={() => { 
              localStorage.removeItem('token'); 
              try { signOut(auth()); } catch (_) {}
              try { window.dispatchEvent(new CustomEvent('app:auth', { detail: { type: 'logout' } })); } catch (_) {}
            }}
          />
          <AuthModal open={authOpen} initialView={authView} onClose={() => setAuthOpen(false)} />
          <Box component="main" sx={{ flexGrow: 1 }}>
            <Suspense fallback={
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
                <CircularProgress />
              </Box>
            }>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/products" element={<Navigate to="/shop" replace />} />
                <Route path="/p/:id" element={<ProductDetails />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/checkout" element={<RequireAuth checking={checking} user={user}><Checkout /></RequireAuth>} />
                <Route path="*" element={<Home />} />
              </Routes>
            </Suspense>
          </Box>
          <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 3 }}>
            <Container maxWidth="lg">
              <Typography variant="body2" color="text.secondary" align="center">
                © {new Date().getFullYear()} animerch. All rights reserved.
              </Typography>
            </Container>
          </Box>
        </Box>
      </CartProvider>
    </ThemeProvider>
  );
}

// Session check: on load and when auth modal closes
export function useSession(setUser) {
  const checkSession = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setUser(null); return; }
      const { data } = await api.get('/auth/me');
      setUser(data.user || null);
    } catch (_e) {
      setUser(null);
    }
  }, [setUser]);
  return { checkSession };
}

// Global route notice (storefront only) to explain admin redirects
function RouteNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [severity, setSeverity] = useState('warning');

  useEffect(() => {
    const n = location.state?.notice;
    if (!n) return;
    if (n === 'auth') {
      setMsg('Please sign in to access the admin panel.');
      setSeverity('warning');
      setOpen(true);
    } else if (n === 'not_admin') {
      setMsg('You must be an admin to access that page.');
      setSeverity('error');
      setOpen(true);
    } else if (n === 'login_required') {
      setMsg('Please sign in to proceed to checkout.');
      setSeverity('warning');
      setOpen(true);
    }
    // Clear state so it doesn't re-trigger on navigation
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={() => setOpen(false)} severity={severity} sx={{ width: '100%' }}>
        {msg}
      </Alert>
    </Snackbar>
  );
}

// Lightweight auth guard for storefront routes
function RequireAuth({ children, checking, user }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!checking && !user) {
      try { window.dispatchEvent(new CustomEvent('app:auth-open', { detail: { view: 'login' } })); } catch (_) {}
      navigate('/shop', { replace: true, state: { notice: 'login_required' } });
    }
  }, [checking, user, navigate]);
  if (checking) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!user) return null;
  return children;
}
