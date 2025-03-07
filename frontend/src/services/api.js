// Use localhost for development
const API_URL = 'http://localhost:5000';

// Fetch all stocks
export const fetchStocks = async () => {
  try {
    const response = await fetch(`${API_URL}/api/stocks`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stocks: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in fetchStocks:', error);
    throw error;
  }
};

// Add a new stock
export const addStock = async (stockData) => {
  try {
    const response = await fetch(`${API_URL}/api/stocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stockData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add stock: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in addStock:', error);
    throw error;
  }
};

// Update an existing stock
export const updateStock = async (stockId, stockData) => {
  try {
    const response = await fetch(`${API_URL}/api/stocks/${stockId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stockData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update stock: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in updateStock:', error);
    throw error;
  }
};

// Delete a stock
export const deleteStock = async (stockId) => {
  try {
    const response = await fetch(`${API_URL}/api/stocks/${stockId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete stock: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in deleteStock:', error);
    throw error;
  }
};