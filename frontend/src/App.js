import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography } from '@mui/material';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import { fetchStocks } from './services/api';

// Your routes and other middleware...
// Create a more aesthetically pleasing theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5', // Indigo
      light: '#757de8',
      dark: '#002984',
    },
    secondary: {
      main: '#f50057', // Pink
      light: '#ff5983',
      dark: '#bb002f',
    },
    background: {
      default: '#f5f5f5', // Light gray background
      paper: '#ffffff',
    },
    success: {
      main: '#4caf50', // Green
      light: '#80e27e',
      dark: '#087f23',
    },
    error: {
      main: '#f44336', // Red
      light: '#ff7961',
      dark: '#ba000d',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
    h6: {
      fontWeight: 500,
      letterSpacing: '0.01em',
    },
    subtitle1: {
      fontWeight: 500,
      color: '#616161',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 3px 15px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#f5f5f5',
        },
      },
    },
  },
});

// Wrapper component to handle navigation
const AppContent = () => {
  const [currency, setCurrency] = useState('USD');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const location = useLocation();

  // Force re-render when location changes
  useEffect(() => {
    console.log('Route changed to:', location.pathname);
  }, [location]);

  const handleRefresh = () => {
    // Increment the refresh trigger to cause a re-render
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header 
        onRefresh={handleRefresh}
      />
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 } }}>
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                key={`dashboard-${refreshTrigger}`} // Force re-render on refresh
                currency={currency} 
                onCurrencyChange={handleCurrencyChange} 
              />
            } 
          />
          {/* Redirect dashboard route to root */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          {/* Redirect any other routes to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
      <Box component="footer" sx={{ py: 2, textAlign: 'center', bgcolor: 'background.paper', mt: 'auto', borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Manas Karra
        </Typography>
      </Box>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;