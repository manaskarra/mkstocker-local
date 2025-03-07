const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://your-username:your-password@mkstocker.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

let db;

async function connectToDatabase() {
  if (db) return db;
  
  await client.connect();
  db = client.db('stockportfolio');
  return db;
}

module.exports = { connectToDatabase }; 