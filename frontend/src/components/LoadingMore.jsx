import { Box, CircularProgress, Paper, Typography } from '@mui/material';
import { keyframes } from '@mui/system';

const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const dot = keyframes`
  0%, 20% { transform: translateY(0); opacity: .5; }
  50% { transform: translateY(-2px); opacity: 1; }
  80%, 100% { transform: translateY(0); opacity: .5; }
`;

export default function LoadingMore({ text = 'Loading more products' }) {
  return (
    <Box role="status" aria-live="polite" sx={{ my: 1.5 }}>
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.25,
          mx: 'auto',
          maxWidth: 360,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <CircularProgress size={18} thickness={4} />
        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
          {text}
          <Box component="span" sx={{ display: 'inline-flex', ml: 0.5 }}>
            <Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.secondary', mx: 0.3, animation: `${dot} 1.4s ease-in-out infinite`, animationDelay: '0ms' }} />
            <Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.secondary', mx: 0.3, animation: `${dot} 1.4s ease-in-out infinite`, animationDelay: '150ms' }} />
            <Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.secondary', mx: 0.3, animation: `${dot} 1.4s ease-in-out infinite`, animationDelay: '300ms' }} />
          </Box>
        </Typography>
      </Paper>
      <Box sx={{ position: 'relative', height: 3, mt: 1, mx: 'auto', maxWidth: 360, overflow: 'hidden', bgcolor: 'divider', borderRadius: 2 }}>
        <Box sx={{ position: 'absolute', inset: 0, transform: 'translateX(-100%)', background: theme => `linear-gradient(90deg, transparent, ${theme.palette.action.hover}, transparent)`, animation: `${shimmer} 1.6s ease-in-out infinite` }} />
      </Box>
    </Box>
  );
}
