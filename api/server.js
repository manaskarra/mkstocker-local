const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

async function connectToDatabase() {
  if (!db) {
    await client.connect();
    db = client.db('stockportfolio');
    console.log('Connected to MongoDB');
  }
  return db;
}

// Initialize database with data from portfolio.json if empty
async function initializeDb() {
  try {
    const db = await connectToDatabase();
    const count = await db.collection('stocks').countDocuments();
    console.log(`Current stock count in MongoDB: ${count}`);
    
    if (count === 0) {
      try {
        const portfolioData = require('../backend/portfolio.json');
        console.log(`Portfolio data loaded: ${JSON.stringify(portfolioData)}`);
        
        if (portfolioData.stocks && portfolioData.stocks.length > 0) {
          await db.collection('stocks').insertMany(portfolioData.stocks);
          console.log(`Inserted ${portfolioData.stocks.length} stocks into MongoDB`);
        }
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    }
  } catch (error) {
    console.error('Error in initializeDb:', error);
  }
}

// Initialize the database
initializeDb();

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working', 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'not set'
  });
});

// Debug route to check MongoDB connection and data
app.get('/api/debug', async (req, res) => {
  try {
    const debugInfo = {
      mongoConnected: false,
      stockCount: 0,
      portfolioFileExists: false,
      portfolioStockCount: 0,
      error: null
    };
    
    try {
      // Check MongoDB connection
      const db = await connectToDatabase();
      debugInfo.mongoConnected = true;
      
      // Check stock count
      const stocks = await db.collection('stocks').find({}).toArray();
      debugInfo.stockCount = stocks.length;
      
      // Check portfolio.json
      try {
        const portfolioData = require('../backend/portfolio.json');
        debugInfo.portfolioFileExists = true;
        debugInfo.portfolioStockCount = portfolioData.stocks ? portfolioData.stocks.length : 0;
      } catch (fileError) {
        debugInfo.error = `Portfolio file error: ${fileError.message}`;
      }
    } catch (dbError) {
      debugInfo.error = `Database error: ${dbError.message}`;
    }
    
    res.json(debugInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all stocks
app.get('/api/stocks', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const stocks = await db.collection('stocks').find({}).toArray();
    
    // Define fixed order for specific tickers
    const fixedOrder = {
      'SPLG': 1,
      'QQQM': 2,
      'BTC-USD': 3,
      'XRP-USD': 4
    };
    
    // Apply fixed order to stocks
    for (const stock of stocks) {
      if (stock.ticker in fixedOrder) {
        stock.order = fixedOrder[stock.ticker];
      } else if (!stock.order) {
        stock.order = 999;  // Default high number for other stocks
      }
      
      // Remove MongoDB _id from response
      if (stock._id) delete stock._id;
    }
    
    // Sort stocks by order
    stocks.sort((a, b) => a.order - b.order);
    
    res.json({ stocks });
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

// Add a new stock
app.post('/api/stocks', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const newStock = req.body;
    
    // Generate a unique ID
    const count = await db.collection('stocks').countDocuments();
    newStock.id = String(count + 1);
    
    // Set default order if not provided
    if (!newStock.order) {
      newStock.order = count + 1;
    }
    
    const result = await db.collection('stocks').insertOne(newStock);
    
    // Remove MongoDB _id from response
    const returnStock = { ...newStock };
    if (returnStock._id) delete returnStock._id;
    
    res.status(201).json(returnStock);
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// Update a stock
app.put('/api/stocks/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const stockId = req.params.id;
    const updatedStock = req.body;
    
    // Remove _id if present to avoid MongoDB errors
    if (updatedStock._id) delete updatedStock._id;
    
    const result = await db.collection('stocks').updateOne(
      { id: stockId },
      { $set: updatedStock }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    
    res.json(updatedStock);
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Delete a stock
app.delete('/api/stocks/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const stockId = req.params.id;
    
    const stock = await db.collection('stocks').findOne({ id: stockId });
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    
    // Remove MongoDB _id from response
    const returnStock = { ...stock };
    if (returnStock._id) delete returnStock._id;
    
    await db.collection('stocks').deleteOne({ id: stockId });
    res.json(returnStock);
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({ error: 'Failed to delete stock' });
  }
});

// Get stock history
app.get('/api/stocks/:ticker/history', async (req, res) => {
  try {
    const ticker = req.params.ticker;
    // In a real app, you would fetch historical data from an API
    // For now, return mock data
    const mockHistory = [
      { date: '2023-01-01', price: 100 },
      { date: '2023-02-01', price: 105 },
      { date: '2023-03-01', price: 110 },
      { date: '2023-04-01', price: 108 },
      { date: '2023-05-01', price: 115 }
    ];
    
    res.json({ history: mockHistory });
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ error: 'Failed to fetch stock history' });
  }
});

// Refresh stock data
app.post('/api/stocks/refresh', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const stocks = await db.collection('stocks').find({}).toArray();
    
    // In a real app, you would update prices here from an external API
    // For now, we'll just return the current stocks
    
    // Remove MongoDB _id from response
    for (const stock of stocks) {
      if (stock._id) delete stock._id;
    }
    
    res.json({ stocks });
  } catch (error) {
    console.error('Error refreshing stocks:', error);
    res.status(500).json({ error: 'Failed to refresh stocks' });
  }
});

// Get exchange rate
app.get('/api/exchange-rate', async (req, res) => {
  // For simplicity, using a fixed exchange rate
  // In a real app, you would fetch this from an API
  res.json({ USD_to_AED: 3.67 });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;