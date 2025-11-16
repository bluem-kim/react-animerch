import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { api } from '../../utils/api';
import { useState } from 'react';
import { auth, getFirebaseApp } from '../../utils/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification, signOut } from 'firebase/auth';
import { Box, TextField, Button, Alert, Card, CardContent, Typography, Avatar, Divider, CircularProgress } from '@mui/material';
import { Google, Login as LoginIcon } from '@mui/icons-material';

const loginSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Enter a valid email address')
    .max(255, 'Email is too long'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long'),
});

export default function Login({ onAuthSuccess }) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const onSubmit = async (values) => {
    setError(null); setSuccess(null);
    try {
      getFirebaseApp();
      const credential = await signInWithEmailAndPassword(auth(), values.email, values.password);
      if (!credential.user.emailVerified) {
        try {
          const continueUrl = window.location.origin;
          await sendEmailVerification(credential.user, { url: continueUrl });
        } catch (_) {}
        try { await signOut(auth()); } catch (_) {}
        return setError('Please verify your email. We sent a new verification link.');
      }
      const idToken = await credential.user.getIdToken();
      const { data } = await api.post('/login/firebase', { idToken });
      localStorage.setItem('token', data.token);
      // If there is a pending registration photo for this email, upload it now
      try {
        const stored = localStorage.getItem('pending_registration');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.email && parsed.email.toLowerCase() === values.email.toLowerCase() && parsed.photoDataUrl && parsed.photoType) {
            const arr = parsed.photoDataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) u8arr[n] = bstr.charCodeAt(n);
            const file = new File([u8arr], parsed.photoName || 'profile.jpg', { type: mime });
            const fd = new FormData();
            fd.append('photo', file);
            await api.put('/user/profile', fd, { headers: { Authorization: `Bearer ${data.token}` } });
            localStorage.removeItem('pending_registration');
          }
        }
      } catch (_) {}
      try { window.dispatchEvent(new CustomEvent('app:auth', { detail: { type: 'login' } })); } catch (_) {}
      setSuccess('Logged in');
      onAuthSuccess && onAuthSuccess();
    } catch (e) {
      const code = e.code;
      // Firebase auth client errors
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found') return setError('Invalid email or password');
      if (code === 'auth/wrong-password') return setError('Incorrect password');
      if (code === 'auth/too-many-requests') return setError('Too many attempts. Try later.');

      // Axios backend errors
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;
      if (status === 403) {
        // Deactivated account: toast handled globally via interceptor; suppress inline generic message
        return setError(null);
      }
      return setError(msg || 'Login error');
    }
  };

  const googleLogin = async () => {
    setError(null); setSuccess(null);
    try {
      getFirebaseApp();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth(), provider);
      const idToken = await result.user.getIdToken();
      const { data } = await api.post('/login/firebase', { idToken });
      localStorage.setItem('token', data.token);
      // Best-effort: if pending_registration email matches Google email, apply stored photo
      try {
        const stored = localStorage.getItem('pending_registration');
        if (stored) {
          const parsed = JSON.parse(stored);
          const email = result.user.email || '';
          if (parsed.email && parsed.email.toLowerCase() === email.toLowerCase() && parsed.photoDataUrl && parsed.photoType) {
            const arr = parsed.photoDataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) u8arr[n] = bstr.charCodeAt(n);
            const file = new File([u8arr], parsed.photoName || 'profile.jpg', { type: mime });
            const fd = new FormData();
            fd.append('photo', file);
            await api.put('/user/profile', fd, { headers: { Authorization: `Bearer ${data.token}` } });
            localStorage.removeItem('pending_registration');
          }
        }
      } catch (_) {}
      try { window.dispatchEvent(new CustomEvent('app:auth', { detail: { type: 'login' } })); } catch (_) {}
      setSuccess('Logged in with Google');
      onAuthSuccess && onAuthSuccess();
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;
      if (status === 403) {
        // Deactivated account: toast handled globally; suppress inline generic message
        return setError(null);
      }
      setError(msg || e?.message || 'Google login error');
    }
  };

  return (
    <Box sx={{ maxWidth: 450, mx: 'auto' }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main', mx: 'auto', mb: 1.5 }}>
          <LoginIcon />
        </Avatar>
        <Typography variant="h5" fontWeight="bold">Welcome Back</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Sign in to your account to continue</Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="email"
                  label="Email Address"
                  placeholder="you@example.com"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  autoComplete="email"
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
                  label="Password"
                  placeholder="Enter your password"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  autoComplete="current-password"
                />
              )}
            />
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
              sx={{ mt: 1 }}
            >
              {isSubmitting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  Signing in...
                </Box>
              ) : (
                'Sign In'
              )}
            </Button>

            <Divider sx={{ my: 2 }}>Or continue with</Divider>

            <Button
              type="button"
              variant="outlined"
              size="large"
              fullWidth
              disabled={isSubmitting}
              onClick={googleLogin}
              startIcon={<Google />}
            >
              Google
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}