/**
 * MongoDB Connection Test
 *
 * This script tests the MongoDB connection and tries to list collections.
 */

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testMongoConnection() {
  if (!process.env.MONGODB_URI) {
    console.error('MongoDB URI not found in environment variables');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    
    // Test the connection
    await client.db('admin').command({ ping: 1 });
    console.log('✅ MongoDB connection successful!');
    
    // List all databases
    const dbs = await client.db().admin().listDatabases();
    console.log('\nAvailable databases:');
    dbs.databases.forEach(db => {
      console.log(`- ${db.name} (${Math.round(db.sizeOnDisk / 1024 / 1024 * 100) / 100} MB)`);
    });

    // Determine database name from URI or environment variable
    let dbName;
    if (process.env.MONGODB_DB_NAME) {
      dbName = process.env.MONGODB_DB_NAME;
    } else {
      const uriParts = uri.split('/');
      if (uriParts.length > 3) {
        const dbPart = uriParts[3].split('?')[0];
        if (dbPart) {
          dbName = dbPart;
        } else {
          dbName = 'waitlist-serverless'; // Default value
        }
      } else {
        dbName = 'waitlist-serverless'; // Default value
      }
    }
    
    console.log(`\nUsing database: ${dbName}`);
    
    // List collections in the database
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    console.log('\nCollections in database:');
    if (collections.length === 0) {
      console.log('No collections found');
    } else {
      collections.forEach(coll => {
        console.log(`- ${coll.name}`);
      });
    }
    
    // If waitlist collection exists, check some content
    if (collections.some(c => c.name === 'waitlist')) {
      const waitlistCollection = db.collection('waitlist');
      const count = await waitlistCollection.countDocuments();
      console.log(`\nWaitlist collection has ${count} documents`);
      
      if (count > 0) {
        const sample = await waitlistCollection.find().limit(1).toArray();
        console.log('Sample document:');
        console.log(JSON.stringify(sample[0], null, 2));
      }
    }

  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

testMongoConnection().catch(console.error); 