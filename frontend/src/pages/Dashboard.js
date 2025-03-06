import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress, List, ListItem, ListItemText } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchStocks, updateStock, deleteStock, addStock } from '../services/api';
import StockList from '../components/StockList';

// Define fixed order tickers
const FIXED_ORDER_TICKERS = ['SPLG', 'QQQM', 'BTC', 'XRP'];

// Define conversion rates
const CONVERSION_RATES = {
  USD: 1,
  AED: 3.67, // 1 USD = 3.67 AED
  INR: 83.12  // 1 USD = 83.12 INR (approximate rate)
};

// Define colors for pie chart
const COLORS = [
  '#3366CC', '#DC3912', '#FF9900', '#109618', 
  '#990099', '#0099C6', '#DD4477', '#66AA00',
  '#B82E2E', '#316395', '#994499', '#22AA99'
];

const Dashboard = ({ currency, onCurrencyChange }) => {
  const [portfolio, setPortfolio] = useState({ stocks: [] });
  const [portfolioSummary, setPortfolioSummary] = useState({
    total_investment: 0,
    current_value: 0,
    profit_loss: 0,
    profit_loss_percent: 0
  });
  const [pieChartData, setPieChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceRanking, setPerformanceRanking] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load portfolio data once on component mount and when refreshTrigger changes
  useEffect(() => {
    loadPortfolio();
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate portfolio summary whenever portfolio changes or currency changes
  useEffect(() => {
    calculatePortfolioSummary();
    generatePieChartData();
  }, [portfolio, currency]);

  // Calculate performance ranking
  useEffect(() => {
    if (!portfolio.stocks || portfolio.stocks.length === 0) {
      setPerformanceRanking([]);
      return;
    }
    
    // Calculate performance for each ticker
    const tickerPerformance = {};
    
    // Group stocks by ticker
    portfolio.stocks.forEach(stock => {
      if (!tickerPerformance[stock.ticker]) {
        tickerPerformance[stock.ticker] = {
          ticker: stock.ticker,
          totalInvestment: 0,
          currentValue: 0
        };
      }
      
      tickerPerformance[stock.ticker].totalInvestment += stock.buy_price * stock.quantity;
      tickerPerformance[stock.ticker].currentValue += stock.current_price * stock.quantity;
    });
    
    // Calculate profit/loss percentage for each ticker
    const performanceData = Object.values(tickerPerformance).map(item => {
      const profitLoss = item.currentValue - item.totalInvestment;
      const profitLossPercent = item.totalInvestment > 0 
        ? (profitLoss / item.totalInvestment) * 100 
        : 0;
        
      return {
        ticker: item.ticker,
        profitLossPercent,
        profitLoss: convertCurrency(profitLoss)
      };
    });
    
    // Sort by performance (descending)
    performanceData.sort((a, b) => b.profitLossPercent - a.profitLossPercent);
    
    setPerformanceRanking(performanceData);
  }, [portfolio, currency]);

  // Convert value from USD to selected currency
  const convertCurrency = (valueInUSD) => {
    return valueInUSD * CONVERSION_RATES[currency];
  };

  // Format currency for display
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Load portfolio data from API
  const loadPortfolio = async () => {
    setIsLoading(true);
    try {
      const data = await fetchStocks();
      
      // Sort stocks based on fixed order
      if (data.stocks && data.stocks.length > 0) {
        // Group stocks by ticker
        const stocksByTicker = {};
        data.stocks.forEach(stock => {
          const baseTicker = stock.ticker.split('-')[0]; // Handle tickers like BTC-USD
          if (!stocksByTicker[baseTicker]) {
            stocksByTicker[baseTicker] = [];
          }
          stocksByTicker[baseTicker].push(stock);
        });
        
        // Get unique tickers
        const tickers = Object.keys(stocksByTicker);
        
        // Sort tickers based on fixed order
        tickers.sort((a, b) => {
          const aIndex = FIXED_ORDER_TICKERS.indexOf(a);
          const bIndex = FIXED_ORDER_TICKERS.indexOf(b);
          
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          } else if (aIndex !== -1) {
            return -1;
          } else if (bIndex !== -1) {
            return 1;
          } else {
            return a.localeCompare(b);
          }
        });
        
        // Flatten sorted stocks
        const sortedStocks = [];
        tickers.forEach(ticker => {
          stocksByTicker[ticker].forEach(stock => {
            sortedStocks.push(stock);
          });
        });
        
        data.stocks = sortedStocks;
      }
      
      setPortfolio(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading portfolio:', error);
      setIsLoading(false);
    }
  };

  // Calculate portfolio summary
  const calculatePortfolioSummary = () => {
    if (!portfolio.stocks || portfolio.stocks.length === 0) {
      setPortfolioSummary({
        total_investment: 0,
        current_value: 0,
        profit_loss: 0,
        profit_loss_percent: 0
      });
      return;
    }

    const total_investment = portfolio.stocks.reduce(
      (sum, stock) => sum + (stock.buy_price * stock.quantity),
      0
    );
    
    const current_value = portfolio.stocks.reduce(
      (sum, stock) => sum + (stock.current_price * stock.quantity),
      0
    );
    
    const profit_loss = current_value - total_investment;
    const profit_loss_percent = (profit_loss / total_investment) * 100;

    setPortfolioSummary({
      total_investment: convertCurrency(total_investment),
      current_value: convertCurrency(current_value),
      profit_loss: convertCurrency(profit_loss),
      profit_loss_percent
    });
  };

  // Generate pie chart data
  const generatePieChartData = () => {
    // ... existing code ...
  };

  // Custom pie chart label
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    // ... existing code ...
  };

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }) => {
    // ... existing code ...
  };

  // Handle currency change
  const handleCurrencyChange = (event) => {
    if (onCurrencyChange) {
      onCurrencyChange(event.target.value);
    }
  };

  // Convert stocks to selected currency for display
  const convertedStocks = portfolio.stocks ? portfolio.stocks.map(stock => ({
    ...stock,
    buy_price: convertCurrency(stock.buy_price),
    current_price: convertCurrency(stock.current_price),
    current_value: convertCurrency(stock.current_price * stock.quantity),
    profit_loss: convertCurrency((stock.current_price - stock.buy_price) * stock.quantity)
  })) : [];

  // Handle stock edit
  const handleEditStock = async (updatedStock) => {
    try {
      await updateStock(updatedStock.id, updatedStock);
      // Refresh portfolio data
      setRefreshTrigger(prev => prev + 1);
      return true; // Indicate success
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock. Please try again.');
      throw error; // Propagate error
    }
  };

  // Handle stock delete
  const handleDeleteStock = async (stockId) => {
    try {
      await deleteStock(stockId);
      // Refresh portfolio data
      setRefreshTrigger(prev => prev + 1);
      return true; // Indicate success
    } catch (error) {
      console.error('Error deleting stock:', error);
      alert('Failed to delete stock. Please try again.');
      throw error; // Propagate error
    }
  };

  // Handle stock add
  const handleAddStock = async (newStock) => {
    try {
      await addStock(newStock);
      // Refresh portfolio data
      setRefreshTrigger(prev => prev + 1);
      return true; // Indicate success
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Failed to add stock. Please try again.');
      throw error; // Propagate error
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Portfolio Dashboard</Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Portfolio Allocation</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  formatter={(value, entry) => {
                    const { payload } = entry;
                    return (
                      <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#333' }}>
                        {value} ({payload.percentage.toFixed(1)}%)
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Portfolio Summary</Typography>
            
            <Box sx={{ my: 1 }}>
              <Typography variant="subtitle2">Total Investment</Typography>
              <Typography variant="h6">{formatCurrency(portfolioSummary.total_investment)}</Typography>
            </Box>
            
            <Box sx={{ my: 1 }}>
              <Typography variant="subtitle2">Current Value</Typography>
              <Typography variant="h6">{formatCurrency(portfolioSummary.current_value)}</Typography>
            </Box>
            
            <Box sx={{ my: 1 }}>
              <Typography variant="subtitle2">Profit/Loss</Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                <Typography 
                  variant="h6" 
                  fontWeight="bold"
                  color={portfolioSummary.profit_loss >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(portfolioSummary.profit_loss)}
                </Typography>
                <Typography 
                  component="span" 
                  variant="body2" 
                  color={portfolioSummary.profit_loss >= 0 ? 'success.main' : 'error.main'}
                  sx={{ ml: 1 }}
                >
                  ({portfolioSummary.profit_loss_percent.toFixed(2)}%)
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Top Performers</Typography>
            
            {performanceRanking.length === 0 ? (
              <Typography variant="body2">No stocks to rank</Typography>
            ) : (
              <List dense disablePadding>
                {performanceRanking.slice(0, 3).map((item, index) => (
                  <ListItem key={item.ticker} divider={index < Math.min(performanceRanking.length, 3) - 1} 
                            sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">{item.ticker}</Typography>
                          <Typography 
                            variant="body2" 
                            color={item.profitLossPercent >= 0 ? 'success.main' : 'error.main'}
                          >
                            {item.profitLossPercent >= 0 ? '+' : ''}
                            {item.profitLossPercent.toFixed(2)}%
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography 
                          variant="caption" 
                          color={item.profitLoss >= 0 ? 'success.main' : 'error.main'}
                        >
                          {formatCurrency(item.profitLoss)}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3 }}>
        <StockList 
          stocks={convertedStocks || []} 
          onEdit={handleEditStock}
          onDelete={handleDeleteStock}
          onAdd={handleAddStock}
          currency={currency}
          onCurrencyChange={handleCurrencyChange}
          fixedOrderTickers={FIXED_ORDER_TICKERS}
        />
      </Box>
    </Box>
  );
};

export default Dashboard;