import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button, IconButton, Avatar, Box, Container, Drawer, List, ListItem, ListItemButton, ListItemText, Divider } from '@mui/material';
import { Menu as MenuIcon, Home, Store, Person, Info, LightMode, DarkMode, Logout } from '@mui/icons-material';
import CartButton from './CartButton';

export default function Navbar({ onToggleTheme, isDark, onAuthOpen, user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/', icon: <Home fontSize="small" /> },
    { label: 'Shop', path: '/shop', icon: <Store fontSize="small" /> },
    ...(user ? [{ label: 'Profile', path: '/profile', icon: <Person fontSize="small" /> }] : []),
    { label: 'About', path: '/about', icon: <Info fontSize="small" /> },
  ];

  const drawer = (
    <Box onClick={() => setMobileOpen(false)} sx={{ width: 250 }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <svg style={{ width: 32, height: 32, color: '#6366f1' }} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
        </svg>
        <Box sx={{ fontWeight: 700, fontSize: 18 }}>animerch</Box>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
            >
              <Box sx={{ mr: 2, display: 'flex' }}>{item.icon}</Box>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      {user ? (
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Logout />}
            onClick={onLogout}
          >
            Logout
          </Button>
        </Box>
      ) : (
        <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
          <Button fullWidth variant="outlined" onClick={() => onAuthOpen('login')}>
            Sign In
          </Button>
          <Button fullWidth variant="contained" onClick={() => onAuthOpen('register')}>
            Sign Up
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <AppBar position="sticky" color="inherit" elevation={1}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
            <svg style={{ width: 32, height: 32, color: '#6366f1' }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
            </svg>
            <Box sx={{ fontWeight: 700, fontSize: 20, display: { xs: 'none', sm: 'block' } }}>
              animerch
            </Box>
          </Link>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                component={Link}
                to={item.path}
                startIcon={item.icon}
                color={location.pathname === item.path ? 'primary' : 'inherit'}
                sx={{
                  fontWeight: location.pathname === item.path ? 600 : 400,
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
            <IconButton onClick={onToggleTheme} color="inherit">
              {isDark ? <LightMode /> : <DarkMode />}
            </IconButton>
            <CartButton />

            {user ? (
              <>
                <Button
                  component={Link}
                  to="/profile"
                  startIcon={
                    <Avatar src={user.photo?.url} sx={{ width: 28, height: 28 }}>
                      {user.username?.[0]?.toUpperCase()}
                    </Avatar>
                  }
                  sx={{ display: { xs: 'none', sm: 'flex' } }}
                >
                  {user.username}
                </Button>
                <IconButton
                  onClick={onLogout}
                  color="inherit"
                  sx={{ display: { xs: 'none', sm: 'flex' } }}
                >
                  <Logout />
                </IconButton>
              </>
            ) : (
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
                <Button variant="outlined" onClick={() => onAuthOpen('login')}>
                  Sign In
                </Button>
                <Button variant="contained" onClick={() => onAuthOpen('register')}>
                  Sign Up
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </Container>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
}
