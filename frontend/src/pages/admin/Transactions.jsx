import { useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { LocalShipping, DoneAll, Cancel } from '@mui/icons-material';

export default function Transactions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/transactions', { params: { page: 1, limit: 100 } });
      setItems(data.items || []);
    } catch (e) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to load orders', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onUpdate = async (id, statusLabel) => {
    try {
      const statusMap = { Delivered: 'delivered', Shipped: 'shipped', Cancelled: 'cancelled' };
      const { data } = await api.patch(`/transactions/${id}/status`, { status: statusMap[statusLabel] });
      setItems((prev) => prev.map((t) => (t._id === id ? { ...t, status: data.transaction.status } : t)));
      const emailed = data.emailSent ? ' Email notification sent.' : '';
      setToast({ open: true, msg: `Order updated to ${statusLabel}.${emailed}`, severity: 'success' });
    } catch (e) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to update order', severity: 'error' });
    }
  };

  const statusChip = (status) => {
    const map = {
      pending: { label: 'PENDING', color: 'warning' },
      paid: { label: 'PAID', color: 'info' },
      shipped: { label: 'SHIPPED', color: 'info' },
      completed: { label: 'DELIVERED', color: 'success' },
      cancelled: { label: 'CANCELLED', color: 'error' },
    };
    const s = map[status] || { label: status?.toUpperCase?.() || 'UNKNOWN', color: 'default' };
    return <Chip size="small" color={s.color} label={s.label} />;
  };

  const allowedActions = (status) => {
    if (status === 'completed' || status === 'cancelled') return [];
    if (status === 'shipped') return ['Delivered', 'Cancelled'];
    return ['Shipped', 'Delivered', 'Cancelled'];
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Orders</Typography>
      <Card elevation={2}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Placed</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row._id} hover>
                      <TableCell>#{String(row._id).slice(-8).toUpperCase()}</TableCell>
                      <TableCell>
                        {row.userInfo?.username || '—'}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {row.userInfo?.email}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">₱{Number(row.totalAmount).toFixed(2)}</TableCell>
                      <TableCell>{statusChip(row.status)}</TableCell>
                      <TableCell>
                        {new Date(row.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {allowedActions(row.status).includes('Shipped') && (
                            <Button size="small" variant="outlined" startIcon={<LocalShipping />} onClick={() => onUpdate(row._id, 'Shipped')}>
                              Shipped
                            </Button>
                          )}
                          {allowedActions(row.status).includes('Delivered') && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<DoneAll />}
                              disabled={row.status !== 'shipped'}
                              onClick={() => onUpdate(row._id, 'Delivered')}
                              title={row.status !== 'shipped' ? 'Mark as shipped before delivering' : 'Mark as delivered'}
                            >
                              Delivered
                            </Button>
                          )}
                          {allowedActions(row.status).includes('Cancelled') && (
                            <Button size="small" variant="outlined" color="error" startIcon={<Cancel />} onClick={() => onUpdate(row._id, 'Cancelled')}>
                              Cancel
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast((t) => ({ ...t, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
