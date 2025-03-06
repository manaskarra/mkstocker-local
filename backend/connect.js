const { MongoClient } = require('mongodb');

let client;
let dbConnection;

module.exports = {
  connectToDatabase: async function() {
    if (dbConnection) return dbConnection;
    
    try {
      client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      
      dbConnection = client.db('portfolio-tracker');
      console.log("Successfully connected to MongoDB");
      
      return dbConnection;
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
      throw error;
    }
  },
  
  getDb: function() {
    return dbConnection;
  },
  
  closeConnection: async function() {
    if (client) {
      await client.close();
      dbConnection = null;
      client = null;
    }
  }
}; 