import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { api } from '../../utils/api';
import { useState, useEffect } from 'react';
import { getFirebaseApp, auth } from '../../utils/firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from 'firebase/auth';
import { Box, TextField, Button, Alert, Card, CardContent, Typography, Avatar, CircularProgress } from '@mui/material';
import { PersonAdd, Photo } from '@mui/icons-material';

const registerSchema = yup.object({
  username: yup
    .string()
    .required('Username is required')
    .min(2, 'Username must be at least 2 characters')
    .max(50, 'Username is too long')
    .matches(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  email: yup
    .string()
    .required('Email is required')
    .email('Enter a valid email address')
    .max(255, 'Email is too long'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long')
    .matches(/[a-zA-Z]/, 'Password must contain at least one letter'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

export default function Register({ onAuthSuccess }) {
  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      photoFile: null,
    },
  });
  const password = watch('password');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);
  const [pendingCreds, setPendingCreds] = useState(null); // { email, photoFile, username }
  const [photoName, setPhotoName] = useState('');

  // Rehydrate pending info if returning after verification and modal re-opened
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pending_registration');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSuccess(`Verification email sent to ${parsed.email}. After verifying, switch to Sign In and log in.`);
      }
    } catch (_) {}
  }, []);

  const onSubmit = async (values) => {
    setError(null); setSuccess(null);
    try {
      getFirebaseApp();
      const { email, password, username } = values;
      const credential = await createUserWithEmailAndPassword(auth(), email, password);
      // Set display name so backend can read decoded.name
      if (username) {
        await updateProfile(credential.user, { displayName: username });
      }
      // Send verification email and do NOT auto-login
      const continueUrl = window.location.origin;
      await sendEmailVerification(credential.user, { url: continueUrl });
      setRegisteredUser(credential.user);
      setPendingCreds({ email, photoFile: values.photoFile, username });
      // Persist minimal info so photo can upload after modal close/reopen (file itself serialized as base64)
      if (values.photoFile) {
        const file = values.photoFile;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            localStorage.setItem('pending_registration', JSON.stringify({
              email,
              username,
              photoName: file.name,
              photoType: file.type,
              photoDataUrl: reader.result,
            }));
          } catch (_) {}
        };
        reader.readAsDataURL(file);
      } else {
        try { localStorage.setItem('pending_registration', JSON.stringify({ email, username })); } catch (_) {}
      }
      setSuccess(`Verification email sent to ${email}. Please verify, then sign in.`);
      try { await signOut(auth()); } catch (_) {}
    } catch (e) {
      const code = e.code;
      if (code === 'auth/email-already-in-use') setError('Email already in use');
      else if (code === 'auth/weak-password') setError('Weak password (min 6 chars)');
      else setError(e.message || 'Registration error');
    }
  };

  return (
    <Box sx={{ maxWidth: 450, mx: 'auto' }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main', mx: 'auto', mb: 1.5 }}>
          <PersonAdd />
        </Avatar>
        <Typography variant="h5" fontWeight="bold">Create Account</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Join us today and start shopping</Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Username"
                  placeholder="Enter your username"
                  error={!!errors.username}
                  helperText={errors.username?.message}
                  autoComplete="username"
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
                  placeholder="Min 6 characters with at least one letter"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  autoComplete="new-password"
                />
              )}
            />
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="password"
                  label="Confirm Password"
                  placeholder="Re-enter password"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  autoComplete="new-password"
                />
              )}
            />
            <Box>
              <Button variant="outlined" component="label" fullWidth startIcon={<Photo />}>
                Upload Profile Photo (optional)
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setValue('photoFile', file);
                    setPhotoName(file?.name || '');
                  }}
                />
              </Button>
              {photoName && (
                <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                  ✓ {photoName}
                </Typography>
              )}
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            {success && (
              <Button
                type="button"
                variant="outlined"
                fullWidth
                disabled={sendingVerify}
                onClick={async () => {
                  if (!registeredUser) return;
                  setSendingVerify(true);
                  try {
                    const continueUrl = window.location.origin;
                    await sendEmailVerification(registeredUser, { url: continueUrl });
                    setSuccess('Verification email re-sent. Please check your inbox.');
                  } catch (e) {
                    setError(e?.message || 'Failed to resend verification email');
                  } finally {
                    setSendingVerify(false);
                  }
                }}
                sx={{ mt: 1 }}
              >
                {sendingVerify ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} />
                    Sending verification...
                  </Box>
                ) : 'Resend Verification Email'}
              </Button>
            )}
            {/* Photo will be applied automatically on first successful login after verification. */}

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
                  Creating account...
                </Box>
              ) : (
                'Create Account'
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}