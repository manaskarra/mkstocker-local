import { MongoClient, ObjectId } from 'mongodb';

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
    const { id } = req.query;
    
    // Connect to the database
    const db = await connectToDatabase();
    const collection = db.collection('stocks');
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'PUT':
        console.log('Updating stock:', id);
        
        const updateResult = await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: req.body }
        );
        
        if (updateResult.matchedCount === 0) {
          return res.status(404).json({ message: 'Stock not found' });
        }
        
        return res.status(200).json({ message: 'Stock updated successfully' });
        
      case 'DELETE':
        console.log('Deleting stock:', id);
        const deleteResult = await collection.deleteOne({ _id: new ObjectId(id) });
        
        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ message: 'Stock not found' });
        }
        
        return res.status(200).json({ message: 'Stock deleted successfully' });
        
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return res.status(500).json({ error: error.message });
  }
}