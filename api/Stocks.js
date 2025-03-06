import { MongoClient } from 'mongodb';

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

export default async function handler(req, res) {
  try {
    console.log('API request received:', req.method);
    
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
        
        // Add timestamp and generate ID if not provided
        const stockToAdd = {
          ...req.body,
          created_at: new Date().toISOString()
        };
        
        const result = await collection.insertOne(stockToAdd);
        return res.status(201).json({ ...stockToAdd, id: result.insertedId });
        
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return res.status(500).json({ error: error.message });
  }
}