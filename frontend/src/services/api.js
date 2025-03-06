import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// In-memory cache for stock data
let stockCache = null;

// Callback function to be set by App.js
let refreshCallback = null;

// Function to set the refresh callback
export const setRefreshCallback = (callback) => {
  refreshCallback = callback;
};

// API functions
export const fetchStocks = async (forceRefresh = false) => {
  // If we have cached data and no force refresh, return the cache
  if (stockCache && !forceRefresh) {
    console.log('Using cached stock data');
    return stockCache;
  }
  
  try {
    console.log('Fetching fresh stock data from API');
    // Use /api/stocks endpoint
    const response = await api.get('/api/stocks');
    const data = response.data;
    
    // Update the cache
    stockCache = data;
    
    return data;
  } catch (error) {
    console.error('Error fetching stocks:', error);
    throw error;
  }
};

export const updateStock = async (id, stockData) => {
  try {
    // Use /api/stocks/${id} endpoint
    const response = await api.put(`/api/stocks/${id}`, stockData);
    
    // Update the cache with the new data
    if (stockCache && stockCache.stocks) {
      stockCache.stocks = stockCache.stocks.map(stock => 
        stock.id === id ? { ...stock, ...stockData } : stock
      );
    }
    
    // Call the refresh callback if it exists
    if (refreshCallback) {
      console.log('Calling refresh callback after updateStock');
      refreshCallback();
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error updating stock ${id}:`, error);
    throw error;
  }
};

export const deleteStock = async (id) => {
  try {
    // Use /api/stocks/${id} endpoint
    const response = await api.delete(`/api/stocks/${id}`);
    
    // Update the cache by removing the deleted stock
    if (stockCache && stockCache.stocks) {
      stockCache.stocks = stockCache.stocks.filter(stock => stock.id !== id);
    }
    
    // Call the refresh callback if it exists
    if (refreshCallback) {
      console.log('Calling refresh callback after deleteStock');
      refreshCallback();
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error deleting stock ${id}:`, error);
    throw error;
  }
};

export const addStock = async (stockData) => {
  try {
    // Use /api/stocks endpoint
    const response = await api.post('/api/stocks', stockData);
    const newStock = response.data;
    
    // Update the cache with the new stock
    if (stockCache && stockCache.stocks) {
      stockCache.stocks = [...stockCache.stocks, newStock];
    }
    
    // Call the refresh callback if it exists
    if (refreshCallback) {
      console.log('Calling refresh callback after addStock');
      refreshCallback();
    }
    
    return newStock;
  } catch (error) {
    console.error('Error adding stock:', error);
    throw error;
  }
};

export default api;