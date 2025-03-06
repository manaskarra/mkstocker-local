const { MongoClient, ObjectId } = require('mongodb');

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
    const { id } = req.query;
    
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
      case 'PUT':
        console.log('Updating stock:', id);
        const updateData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        console.log('Update data:', updateData);
        
        const updateResult = await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
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
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
};