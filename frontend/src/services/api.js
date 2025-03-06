// In-memory cache for stock data
let stockCache = null;

// Callback function to be set by App.js
let refreshCallback = null;

// Function to set the refresh callback
export const setRefreshCallback = (callback) => {
  refreshCallback = callback;
};

// Helper function to get the base URL
const getBaseUrl = () => {
  // Use window.location.origin to get the current domain
  return window.location.origin;
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
    const url = `${getBaseUrl()}/api/stocks`;
    console.log('Fetching from URL:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
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
    console.log('Updating stock:', id, stockData);
    const url = `${getBaseUrl()}/api/stocks/${id}`;
    console.log('Updating at URL:', url);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stockData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
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
    
    return result;
  } catch (error) {
    console.error(`Error updating stock ${id}:`, error);
    throw error;
  }
};

export const deleteStock = async (id) => {
  try {
    console.log('Deleting stock:', id);
    const url = `${getBaseUrl()}/api/stocks/${id}`;
    console.log('Deleting at URL:', url);
    
    const response = await fetch(url, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Update the cache by removing the deleted stock
    if (stockCache && stockCache.stocks) {
      stockCache.stocks = stockCache.stocks.filter(stock => stock.id !== id);
    }
    
    // Call the refresh callback if it exists
    if (refreshCallback) {
      console.log('Calling refresh callback after deleteStock');
      refreshCallback();
    }
    
    return result;
  } catch (error) {
    console.error(`Error deleting stock ${id}:`, error);
    throw error;
  }
};

export const addStock = async (stockData) => {
  try {
    console.log('Adding stock:', stockData);
    const url = `${getBaseUrl()}/api/stocks`;
    console.log('Adding at URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stockData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to add stock: ${response.status} ${errorText}`);
    }
    
    const newStock = await response.json();
    console.log('Add stock response:', newStock);
    
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