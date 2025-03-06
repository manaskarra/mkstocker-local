// Import MongoDB client
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
    console.log('API request received:', req.method);
    
    // Connect to the database
    const db = await connectToDatabase();
    const collection = db.collection('portfolios');
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        const data = await collection.find({}).toArray();
        return res.status(200).json(data);
        
      case 'POST':
        console.log('Request body:', req.body);
        // Parse the request body if it's a string
        const newData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        console.log('Parsed data:', newData);
        
        const result = await collection.insertOne(newData);
        return res.status(201).json(result);
        
      case 'PUT':
        const { id, ...updateData } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const updateResult = await collection.updateOne(
          { _id: id },
          { $set: updateData }
        );
        return res.status(200).json(updateResult);
        
      case 'DELETE':
        const deleteId = typeof req.body === 'string' ? JSON.parse(req.body).id : req.body.id;
        const deleteResult = await collection.deleteOne({ _id: deleteId });
        return res.status(200).json(deleteResult);
        
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
};