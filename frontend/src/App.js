import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container } from '@mui/material';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import { fetchStocks } from './services/api';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
  });

  // Handle theme toggle
  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };

  // Handle currency change
  const handleCurrencyChange = (newCurrency) => {
    console.log('Currency changed to:', newCurrency);
    setCurrency(newCurrency);
  };

  // Fetch portfolio data
  const fetchPortfolioData = async () => {
    setLoading(true);
    try {
      const data = await fetchStocks();
      console.log('Fetched portfolio data:', data);
      setPortfolioData(data);
      setLastUpdateTime(new Date().toISOString());
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    console.log('Refresh triggered');
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
  };

  // Initial data fetch
  useEffect(() => {
    fetchPortfolioData();
  }, []);

  // Refresh data when triggered
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchPortfolioData();
    }
  }, [refreshTrigger]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout darkMode={darkMode} onThemeToggle={handleThemeToggle}>
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Routes>
              <Route 
                path="/" 
                element={
                  <Dashboard 
                    key={`dashboard-${refreshTrigger}`} // Force re-render on refresh
                    currency={currency} 
                    onCurrencyChange={handleCurrencyChange}
                    portfolioData={portfolioData}
                    loading={loading}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    lastUpdateTime={lastUpdateTime}
                  />
                } 
              />
              {/* Redirect /dashboard to root for backward compatibility */}
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
            </Routes>
          </Container>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;