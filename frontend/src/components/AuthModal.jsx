import { useEffect, useState } from 'react';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import { Dialog, DialogContent, Box, Tabs, Tab, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';

export default function AuthModal({ open, initialView = 'login', onClose }) {
  const [view, setView] = useState(initialView);
  useEffect(() => { if (open) setView(initialView); }, [open, initialView]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 1 }}>
        <Tabs value={view === 'login' ? 0 : 1} onChange={(_, v) => setView(v === 0 ? 'login' : 'register')}>
          <Tab label="Sign In" />
          <Tab label="Sign Up" />
        </Tabs>
        <IconButton onClick={onClose} edge="end">
          <Close />
        </IconButton>
      </Box>
      <DialogContent>
        {view === 'login' ? (
          <Login onAuthSuccess={onClose} />
        ) : (
          <Register onAuthSuccess={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
