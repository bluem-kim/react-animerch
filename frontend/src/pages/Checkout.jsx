import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Stack,
  Divider,
  Button,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  FormHelperText,
  Paper,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  LocalShipping,
  Payment,
  CheckCircle,
  ShoppingBag,
} from '@mui/icons-material';
import { useCart } from '../context/CartContext';
import { api } from '../utils/api';

const checkoutSchema = yup.object({
  shippingAddress: yup
    .string()
    .required('Shipping address is required')
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address is too long'),
  contactPhone: yup
    .string()
    .required('Contact phone is required')
    .matches(/^[0-9+\-() ]+$/, 'Invalid phone number format')
    .min(7, 'Phone number is too short')
    .max(20, 'Phone number is too long'),
  notes: yup.string().max(500, 'Notes are too long'),
});

export default function Checkout() {
  const cart = useCart();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    resolver: yupResolver(checkoutSchema),
    mode: 'onChange',
    defaultValues: {
      shippingAddress: '',
      contactPhone: '',
      notes: '',
    },
  });

  const total = useMemo(() => cart.subtotal, [cart.subtotal]);
  const shippingFee = 0; // Free shipping
  const grandTotal = total + shippingFee;

  const onSubmit = async (data) => {
    setApiError('');
    // Require login before attempting to place an order
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setApiError('Please sign in to checkout.');
      try { window.dispatchEvent(new CustomEvent('app:auth-open', { detail: { view: 'login' } })); } catch (_) {}
      navigate('/shop', { replace: true, state: { notice: 'login_required' } });
      return;
    }
    if (cart.items.length === 0) {
      setApiError('Your cart is empty.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        items: cart.items.map((i) => ({ product: i.product, quantity: i.quantity })),
        shippingAddress: data.shippingAddress,
        contactPhone: data.contactPhone,
        notes: data.notes,
      };
      await api.post('/transactions', payload);
      cart.clear();
      navigate('/profile', { state: { orderSuccess: true, orderEmailed: true } });
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to place order. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <ShoppingBag sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Your cart is empty
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Add some items to your cart before checking out.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/shop')}>
          Continue Shopping
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
          Checkout
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Complete your order with secure cash on delivery
        </Typography>

        <Stepper activeStep={0} sx={{ mb: 4, display: { xs: 'none', sm: 'flex' } }}>
          <Step>
            <StepLabel>Shipping Details</StepLabel>
          </Step>
          <Step>
            <StepLabel>Review Order</StepLabel>
          </Step>
          <Step>
            <StepLabel>Place Order</StepLabel>
          </Step>
        </Stepper>

        {apiError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setApiError('')}>
            {apiError}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Left Column - Shipping Form */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card elevation={2}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <LocalShipping color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Shipping Information
                    </Typography>
                  </Box>

                  <Stack spacing={3}>
                    <Controller
                      name="shippingAddress"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Shipping Address *"
                          placeholder="Street address, city, province, postal code"
                          multiline
                          rows={3}
                          fullWidth
                          error={!!errors.shippingAddress}
                          helperText={errors.shippingAddress?.message}
                          variant="outlined"
                        />
                      )}
                    />

                    <Controller
                      name="contactPhone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Contact Phone *"
                          placeholder="+63 912 345 6789"
                          fullWidth
                          error={!!errors.contactPhone}
                          helperText={errors.contactPhone?.message}
                          variant="outlined"
                        />
                      )}
                    />

                    <Controller
                      name="notes"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Order Notes (Optional)"
                          placeholder="Special instructions, delivery preferences, etc."
                          multiline
                          rows={2}
                          fullWidth
                          error={!!errors.notes}
                          helperText={errors.notes?.message || 'Any special instructions for your order'}
                          variant="outlined"
                        />
                      )}
                    />
                  </Stack>
                </CardContent>
              </Card>

              <Card elevation={2} sx={{ mt: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Payment color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Payment Method
                    </Typography>
                  </Box>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: 'primary.50',
                      borderColor: 'primary.main',
                      borderWidth: 2,
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography fontWeight={600} gutterBottom>
                          Cash on Delivery (COD)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pay when you receive your order
                        </Typography>
                      </Box>
                      <Chip label="Selected" color="primary" size="small" />
                    </Stack>
                  </Paper>
                  <FormHelperText sx={{ mt: 1, ml: 2 }}>
                    Payment will be collected upon delivery of your order
                  </FormHelperText>
                </CardContent>
              </Card>
            </Grid>

            {/* Right Column - Order Summary */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card elevation={2} sx={{ position: 'sticky', top: 16 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Order Summary
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <List disablePadding>
                    {cart.items.map((item) => (
                      <ListItem key={item.product} disableGutters sx={{ py: 1.5 }}>
                        <ListItemAvatar>
                          <Avatar
                            variant="rounded"
                            src={item.photoUrl}
                            alt={item.name}
                            sx={{ width: 64, height: 64, mr: 1 }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography fontWeight={600} variant="body2">
                              {item.name}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              ₱{Number(item.price).toFixed(2)} × {item.quantity}
                            </Typography>
                          }
                        />
                        <Typography fontWeight={700} variant="body1">
                          ₱{(Number(item.price) * item.quantity).toFixed(2)}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Subtotal</Typography>
                      <Typography fontWeight={600}>₱{total.toFixed(2)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Shipping</Typography>
                      <Typography fontWeight={600} color="success.main">
                        Free
                      </Typography>
                    </Stack>
                    <Divider />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="h6" fontWeight={700}>
                        Total
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="primary">
                        ₱{grandTotal.toFixed(2)}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading || !isValid}
                    startIcon={loading ? null : <CheckCircle />}
                    sx={{ mt: 3, py: 1.5 }}
                  >
                    {loading ? 'Processing...' : 'Place Order'}
                  </Button>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    align="center"
                    display="block"
                    sx={{ mt: 2 }}
                  >
                    By placing your order, you agree to our terms and conditions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </form>
      </Container>
    </Box>
  );
}
