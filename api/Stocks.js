const { MongoClient } = require('mongodb');

// Create a cached connection variable
let cachedDb = null;

// Function to connect to the database
async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  // Connect to the MongoDB database
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('portfolio-tracker');
  
  cachedDb = db;
  return db;
}

// Export the API handler function
module.exports = async (req, res) => {
  try {
    console.log('API request received:', req.method, req.url);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle OPTIONS method for preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Connect to the database
    const db = await connectToDatabase();
    const collection = db.collection('stocks');
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        const data = await collection.find({}).toArray();
        return res.status(200).json({ stocks: data });
        
      case 'POST':
        console.log('Request body:', req.body);
        // Parse the request body if it's a string
        const newData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        console.log('Parsed data:', newData);
        
        // Add timestamp and generate ID if not provided
        const stockToAdd = {
          ...newData,
          created_at: new Date().toISOString()
        };
        
        const result = await collection.insertOne(stockToAdd);
        return res.status(201).json({ ...stockToAdd, id: result.insertedId });
        
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
};