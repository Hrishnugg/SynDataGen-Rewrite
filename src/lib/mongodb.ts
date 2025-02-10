import { MongoClient, ServerApiVersion } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Missing MONGODB_URI environment variable. Please check your .env.local file');
}

const uri = process.env.MONGODB_URI;

// Separate options for development and production
const baseOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  ssl: true,
};

const productionOptions = {
  ...baseOptions,
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 15000,
  connectTimeoutMS: 10000,
};

const options = process.env.NODE_ENV === 'production' ? productionOptions : baseOptions;

// Cache the client in development
let client: MongoClient | undefined;
let clientPromise: Promise<MongoClient>;

const connectToDatabase = async () => {
  try {
    const client = new MongoClient(uri, options);
    await client.connect();
    await client.db().command({ ping: 1 }); // Test the connection
    console.log('Successfully connected to MongoDB');
    return client;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = connectToDatabase();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, create a new client for each connection
  clientPromise = connectToDatabase();
}

export default clientPromise;