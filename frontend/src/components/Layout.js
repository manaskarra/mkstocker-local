import React from 'react';
import { Box, Container } from '@mui/material';
import Header from './Header';

const Layout = ({ children, darkMode, onThemeToggle }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header darkMode={darkMode} onThemeToggle={onThemeToggle} />
      
      <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Container>
      
      <Box component="footer" sx={{ py: 2, textAlign: 'center', mt: 'auto', borderTop: '1px solid #e0e0e0' }}>
        <Box sx={{ typography: 'body2', color: 'text.secondary' }}>
          © {new Date().getFullYear()} Stock Portfolio Tracker
        </Box>
      </Box>
    </Box>
  );
};

export default Layout; 