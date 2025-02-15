import { MongoClient, ServerApiVersion } from 'mongodb';
import dns from 'dns';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

// Enable DNS caching
dns.setDefaultResultOrder('ipv4first');

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,
  heartbeatFrequencyMS: 2000,
  retryWrites: true,
  retryReads: true,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
} as const;

// Global singleton client
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient>;

const connect = async (): Promise<MongoClient> => {
  try {
    if (client) {
      console.log('Reusing existing MongoDB connection');
      return client;
    }

    console.log('Creating new MongoDB connection');
    client = new MongoClient(uri, options);
    await client.connect();
    
    // Test the connection
    await client.db('admin').command({ ping: 1 });
    console.log('MongoDB connected successfully');

    // Handle connection events
    client.on('close', () => {
      console.log('MongoDB connection closed');
      client = null;
    });

    client.on('error', (error) => {
      console.error('MongoDB connection error:', error);
      client = null;
    });

    return client;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    client = null;
    throw error;
  }
};

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable to maintain the connection
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, it's best to not use a global variable
  clientPromise = connect();
}

export default clientPromise;

export async function testDbConnection() {
  try {
    const connectedClient = await clientPromise;
    await connectedClient.db('admin').command({ ping: 1 });
    console.log("Database connection test successful");
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}

export async function ensureConnection() {
  try {
    const connectedClient = await clientPromise;
    
    // Test the connection
    try {
      await connectedClient.db('admin').command({ ping: 1 });
      return connectedClient;
    } catch (error) {
      // If ping fails, clear the client and try to reconnect
      console.log('Connection test failed, reconnecting...');
      client = null;
      return await connect();
    }
  } catch (error) {
    console.error("Connection error:", error);
    client = null;
    return await connect();
  }
}