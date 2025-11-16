import { useEffect, useState } from 'react';
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
  Select,
  MenuItem,
} from '@mui/material';

export default function Users() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { page: 1, limit: 100 } });
      setItems(data.items || []);
    } catch (e) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to load users', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateRole = async (id, role) => {
    try {
      const { data } = await api.patch(`/admin/users/${id}/role`, { role });
      setItems(prev => prev.map(u => u._id === id ? { ...u, role: data.user.role } : u));
      setToast({ open: true, msg: `Role updated to ${role}.`, severity: 'success' });
    } catch (e) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to update role', severity: 'error' });
    }
  };

  const updateActive = async (id, active) => {
    try {
      const { data } = await api.patch(`/admin/users/${id}/active`, { active });
      setItems(prev => prev.map(u => u._id === id ? { ...u, active: data.user.active } : u));
      setToast({ open: true, msg: active ? 'User activated.' : 'User deactivated.', severity: 'success' });
    } catch (e) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Failed to update status', severity: 'error' });
    }
  };

  const statusChip = (active) => active ? (
    <Chip size="small" color="success" label="ACTIVE" />
  ) : (
    <Chip size="small" color="default" label="INACTIVE" />
  );

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Users</Typography>
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
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((u) => (
                    <TableRow key={u._id} hover>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={u.role}
                          onChange={(e) => updateRole(u._id, e.target.value)}
                        >
                          <MenuItem value="user">user</MenuItem>
                          <MenuItem value="admin">admin</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>{statusChip(!!u.active)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {u.active ? (
                            <Button size="small" variant="outlined" color="warning" onClick={() => updateActive(u._id, false)}>
                              Deactivate
                            </Button>
                          ) : (
                            <Button size="small" variant="contained" color="success" onClick={() => updateActive(u._id, true)}>
                              Activate
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
