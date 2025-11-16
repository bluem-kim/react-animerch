import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { api } from '../../utils/api';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  Snackbar,
} from '@mui/material';
import { Edit, Photo, ShoppingBag, CheckCircle, AccessTime, LocalShipping, Cancel, RateReview } from '@mui/icons-material';

const profileSchema = yup.object({
  username: yup
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(50, 'Username is too long')
    .matches(/^[a-zA-Z0-9_-]*$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  email: yup
    .string()
    .email('Enter a valid email address')
    .max(255, 'Email is too long'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long'),
});

export default function Profile() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [status, setStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(profileSchema),
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch (e) {
        console.error('Failed to fetch user:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (location.state?.orderSuccess) {
      setStatus('Order placed successfully!');
      setTabValue(1);
      setTimeout(() => setStatus(null), 5000);
    }
    if (location.state?.orderEmailed) {
      setToastMsg('Order email confirmation sent!');
      setToastOpen(true);
    }
  }, [location.state]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const { data } = await api.get('/transactions/me');
      setOrders(data.items || []);
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (tabValue === 1) {
      fetchOrders();
    }
    if (tabValue === 2) {
      fetchMyReviews();
    }
  }, [tabValue]);

  const onSubmit = async (values) => {
    setStatus(null);
    try {
      const fd = new FormData();
      if (values.username) fd.append('username', values.username);
      if (values.email) fd.append('email', values.email);
      if (values.password) fd.append('password', values.password);
      if (file) fd.append('photo', file);

      const { data } = await api.put('/user/profile', fd);
      setUser(data.user);
      setStatus('Profile updated successfully');
      reset();
      setFile(null);
      setFileName('');
    } catch (e) {
      setStatus(e.response?.data?.message || 'Failed to update profile');
    }
  };

  const fetchMyReviews = async () => {
    setReviewsLoading(true);
    try {
      const { data } = await api.get('/reviews/my', { params: { page: 1, limit: 100 } });
      setMyReviews(data.items || []);
    } catch (e) {
      console.error('Failed to fetch reviews:', e);
    } finally {
      setReviewsLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'shipped':
        return <LocalShipping color="info" />;
      case 'cancelled':
        return <Cancel color="error" />;
      default:
        return <AccessTime color="warning" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'shipped':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'warning';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        My Profile
      </Typography>

      <Card sx={{ mb: 3 }} elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={user?.photo?.url} sx={{ width: 80, height: 80, fontSize: 28 }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                {user?.username || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              {user?.role && (
                <Chip label={user.role.toUpperCase()} size="small" color="primary" sx={{ mt: 0.5 }} />
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {status && (
        <Alert severity={status.includes('success') ? 'success' : 'error'} sx={{ mb: 3 }} onClose={() => setStatus(null)}>
          {status}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Account Settings" icon={<Edit />} iconPosition="start" />
          <Tab label="My Orders" icon={<ShoppingBag />} iconPosition="start" />
          <Tab label="My Reviews" icon={<RateReview />} iconPosition="start" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Update Information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Update your account details. Leave fields blank to keep current values.
            </Typography>
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Username"
                    placeholder={user?.username || 'Enter new username'}
                    error={!!errors.username}
                    helperText={errors.username?.message || 'Leave blank to keep current'}
                  />
                )}
              />
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="email"
                    label="Email"
                    placeholder={user?.email || 'Enter new email'}
                    error={!!errors.email}
                    helperText={errors.email?.message || 'Leave blank to keep current'}
                  />
                )}
              />
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="password"
                    label="New Password"
                    placeholder="Leave blank to keep current password"
                    error={!!errors.password}
                    helperText={errors.password?.message || 'Minimum 6 characters'}
                  />
                )}
              />
              <Box>
                <Button variant="outlined" component="label" fullWidth startIcon={<Photo />}>
                  Upload Profile Photo
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      setFile(selectedFile);
                      setFileName(selectedFile?.name || '');
                    }}
                  />
                </Button>
                {fileName && (
                  <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                    ✓ Selected: {fileName}
                  </Typography>
                )}
              </Box>

              <Button type="submit" variant="contained" size="large" fullWidth disabled={isSubmitting} startIcon={<Edit />} sx={{ mt: 1 }}>
                {isSubmitting ? 'Updating...' : 'Update Profile'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {tabValue === 1 && (
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Order History
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              View and track all your orders
            </Typography>

            {ordersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : orders.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <ShoppingBag sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No orders yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Start shopping to see your orders here
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {orders.map((order) => (
                  <Paper key={order._id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Order ID: {order._id.slice(-8).toUpperCase()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </Box>
                      <Chip
                        icon={getStatusIcon(order.status)}
                        label={order.status.toUpperCase()}
                        color={getStatusColor(order.status)}
                        size="small"
                      />
                    </Stack>

                    <Divider sx={{ mb: 2 }} />

                    <List disablePadding>
                      {order.items.map((item, idx) => (
                        <ListItem key={idx} disableGutters sx={{ py: 0.5 }}>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={600}>
                                {item.name}
                              </Typography>
                            }
                            secondary={`Qty: ${item.quantity} × ₱${Number(item.price).toFixed(2)}`}
                          />
                          <Typography variant="body2" fontWeight={600}>
                            ₱{(Number(item.price) * item.quantity).toFixed(2)}
                          </Typography>
                        </ListItem>
                      ))}
                    </List>

                    <Divider sx={{ my: 1.5 }} />

                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Payment Method
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
                        </Typography>
                      </Stack>
                      {order.shippingAddress && (
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
                            Shipping Address
                          </Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ maxWidth: '60%', textAlign: 'right' }}>
                            {order.shippingAddress}
                          </Typography>
                        </Stack>
                      )}
                      {order.contactPhone && (
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
                            Contact Phone
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {order.contactPhone}
                          </Typography>
                        </Stack>
                      )}
                      <Divider sx={{ my: 1 }} />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="h6" fontWeight={700}>
                          Total
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color="primary">
                          ₱{Number(order.totalAmount).toFixed(2)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && (
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              My Reviews
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your product ratings and comments
            </Typography>

            {reviewsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : myReviews.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <RateReview sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No reviews yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rate products you purchased to share your experience
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell>Rating</TableCell>
                      <TableCell>Comment</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {myReviews.map((r) => (
                      <TableRow key={r._id} hover>
                        <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{r.product?.name || '—'}</TableCell>
                        <TableCell>
                          <span style={{ color: '#F59E0B' }}>{'★★★★★'.slice(0, Math.max(0, r.rating))}</span>
                          <span style={{ color: '#9CA3AF' }}>{'★★★★★'.slice(r.rating)}</span>
                        </TableCell>
                        <TableCell>{r.comment || '—'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={r.approved ? 'Approved' : 'Pending'} color={r.approved ? 'success' : 'warning'} />
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="text" href={`/p/${r.product?._id || r.product}`}>Open</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}
      <Snackbar
        open={toastOpen}
        autoHideDuration={4000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setToastOpen(false)} severity="success" sx={{ width: '100%' }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </Container>
  );
}