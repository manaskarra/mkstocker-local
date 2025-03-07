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

const Dashboard = ({ 
  currency, 
  onCurrencyChange, 
  portfolioData, 
  loading, 
  onRefresh, 
  isRefreshing, 
  lastUpdateTime 
}) => {
  const [portfolio, setPortfolio] = useState({ stocks: [] });
  const [portfolioSummary, setPortfolioSummary] = useState({
    total_investment: 0,
    current_value: 0,
    profit_loss: 0,
    profit_loss_percent: 0
  });
  const [pieChartData, setPieChartData] = useState([]);
  const [performanceRanking, setPerformanceRanking] = useState([]);
  const [convertedStocks, setConvertedStocks] = useState([]);

  // Update portfolio when portfolioData changes
  useEffect(() => {
    if (portfolioData) {
      setPortfolio(portfolioData);
    }
  }, [portfolioData]);

  // Calculate portfolio summary whenever portfolio changes or currency changes
  useEffect(() => {
    calculatePortfolioSummary();
    generatePieChartData();
    convertStocksForDisplay();
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
    // Fix 1: Add validation to ensure currency is a string
    if (typeof currency !== 'string') {
      console.error('Invalid currency code:', currency);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    }
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `${value} ${currency}`;
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
    
    let totalInvestment = 0;
    let currentValue = 0;
    
    portfolio.stocks.forEach(stock => {
      totalInvestment += stock.buy_price * stock.quantity;
      currentValue += stock.current_price * stock.quantity;
    });
    
    const profitLoss = currentValue - totalInvestment;
    const profitLossPercent = totalInvestment > 0 
      ? (profitLoss / totalInvestment) * 100 
      : 0;
    
    setPortfolioSummary({
      total_investment: convertCurrency(totalInvestment),
      current_value: convertCurrency(currentValue),
      profit_loss: convertCurrency(profitLoss),
      profit_loss_percent: profitLossPercent
    });
  };

  // Generate pie chart data
  const generatePieChartData = () => {
    if (!portfolio.stocks || portfolio.stocks.length === 0) {
      setPieChartData([]);
      return;
    }
    
    // Group by ticker
    const tickerValues = {};
    let totalValue = 0;
    
    portfolio.stocks.forEach(stock => {
      const value = stock.current_price * stock.quantity;
      totalValue += value;
      
      const baseTicker = stock.ticker.split('-')[0]; // Handle tickers like BTC-USD
      
      if (!tickerValues[baseTicker]) {
        tickerValues[baseTicker] = 0;
      }
      
      tickerValues[baseTicker] += value;
    });
    
    // Convert to array format for pie chart
    const chartData = Object.keys(tickerValues).map(ticker => ({
      name: ticker,
      value: convertCurrency(tickerValues[ticker]),
      percentage: (tickerValues[ticker] / totalValue) * 100
    }));
    
    // Sort by value (descending)
    chartData.sort((a, b) => b.value - a.value);
    
    setPieChartData(chartData);
  };

  // Convert stocks for display with the selected currency
  const convertStocksForDisplay = () => {
    if (!portfolio.stocks || portfolio.stocks.length === 0) {
      setConvertedStocks([]);
      return;
    }
    
    const converted = portfolio.stocks.map(stock => ({
      ...stock,
      buy_price: convertCurrency(stock.buy_price),
      current_price: convertCurrency(stock.current_price),
      current_value: convertCurrency(stock.current_price * stock.quantity),
      profit_loss: convertCurrency((stock.current_price - stock.buy_price) * stock.quantity),
      profit_loss_percent: stock.buy_price > 0 
        ? ((stock.current_price - stock.buy_price) / stock.buy_price) * 100 
        : 0
    }));
    
    setConvertedStocks(converted);
  };

  // Custom label for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    if (percent < 0.05) return null; // Don't show labels for small slices
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1, boxShadow: 2 }}>
          <Typography variant="subtitle2">{data.name}</Typography>
          <Typography variant="body2">{formatCurrency(data.value)}</Typography>
          <Typography variant="body2">
            {data.percentage.toFixed(2)}% of portfolio
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // Handle stock operations
  const handleAddStock = async (newStock) => {
    try {
      await addStock(newStock);
      onRefresh(); // Trigger refresh
      return true;
    } catch (error) {
      console.error('Error adding stock:', error);
      return false;
    }
  };

  const handleEditStock = async (updatedStock) => {
    try {
      await updateStock(updatedStock.id, updatedStock);
      onRefresh(); // Trigger refresh
      return true;
    } catch (error) {
      console.error('Error updating stock:', error);
      return false;
    }
  };

  const handleDeleteStock = async (stockId) => {
    try {
      await deleteStock(stockId);
      onRefresh(); // Trigger refresh
      return true;
    } catch (error) {
      console.error('Error deleting stock:', error);
      return false;
    }
  };

  if (loading && !portfolioData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Portfolio Dashboard</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Asset Allocation</Typography>
            
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  // Fix 2: Remove the label prop to remove percentage text from pie chart
                  // label={renderCustomizedLabel}
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
          onCurrencyChange={onCurrencyChange}
          fixedOrderTickers={FIXED_ORDER_TICKERS}
        />
      </Box>
    </Box>
  );
};

export default Dashboard;