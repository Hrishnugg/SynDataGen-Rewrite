import { MongoClient, ServerApiVersion } from 'mongodb';
import dns from 'dns';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

// Enable DNS caching
dns.setDefaultResultOrder('ipv4first');

// Modify the URI to use a different port for outbound connections
const baseUri = process.env.MONGODB_URI;
const uri = baseUri.includes('?') 
  ? `${baseUri}&localThresholdMS=2000&connectTimeoutMS=10000&socketTimeoutMS=45000`
  : `${baseUri}?localThresholdMS=2000&connectTimeoutMS=10000&socketTimeoutMS=45000`;

const options = {
  maxPoolSize: 1,
  minPoolSize: 0,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 10000,
  family: 4,
  retryWrites: true,
  retryReads: true,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
} as const;

// Track connection state
let client: MongoClient | null = null;
let connectingPromise: Promise<MongoClient> | null = null;
let isShuttingDown = false;
let connectionAttempts = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

// Handle process termination
if (process.env.NODE_ENV === 'development') {
  process.on('SIGINT', async () => {
    isShuttingDown = true;
    await cleanupConnection();
    process.exit(0);
  });
}

const cleanupConnection = async () => {
  if (client) {
    try {
      await client.close(true);
    } catch (err) {
      console.error('Error during connection cleanup:', err);
    }
    client = null;
  }
  
  // Reset connection state
  connectingPromise = null;
  
  // Add longer delay for Windows socket cleanup
  if (process.platform === 'win32') {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};

const connect = async (): Promise<MongoClient> => {
  if (isShuttingDown) {
    throw new Error('Server is shutting down');
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  if (connectionAttempts >= MAX_RETRIES) {
    await cleanupConnection();
    connectionAttempts = 0;
    throw new Error(`Failed to connect after ${MAX_RETRIES} attempts`);
  }

  connectingPromise = (async () => {
    try {
      if (client) {
        try {
          await client.db('admin').command({ ping: 1 });
          console.log('Reusing existing MongoDB connection');
          return client;
        } catch (error) {
          console.log('Existing connection failed, cleaning up...');
          await cleanupConnection();
        }
      }

      connectionAttempts++;
      console.log(`Creating new MongoDB connection (attempt ${connectionAttempts}/${MAX_RETRIES})`);

      if (connectionAttempts > 1) {
        const delay = RETRY_DELAY * connectionAttempts;
        console.log(`Waiting ${delay}ms before next connection attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Create a new client with unique session ID
      const sessionId = Math.random().toString(36).substring(2, 15);
      console.log(`Initializing connection with session ID: ${sessionId}`);
      
      client = new MongoClient(uri, {
        ...options,
        metadata: { sessionId }
      });

      try {
        await client.connect();
        await client.db('admin').command({ ping: 1 });
        console.log('MongoDB connected successfully');
        
        connectionAttempts = 0;
        return client;
      } catch (error: any) {
        console.error('MongoDB connection error:', error);
        
        // Special handling for Windows errors
        if (process.platform === 'win32') {
          console.log('Connection failed on Windows, performing extended cleanup...');
          await cleanupConnection();
          // Force garbage collection if available
          if (global.gc) {
            console.log('Running garbage collection...');
            global.gc();
          }
        } else {
          await cleanupConnection();
        }
        
        if (connectionAttempts < MAX_RETRIES) {
          connectingPromise = null;
          return await connect();
        }
        throw error;
      }
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
};

// Create a new promise for the client
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
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
    try {
      await connectedClient.db('admin').command({ ping: 1 });
      return connectedClient;
    } catch (error) {
      console.log('Connection test failed, reconnecting...');
      await cleanupConnection();
      connectionAttempts = 0;
      return await connect();
    }
  } catch (error) {
    console.error("Connection error:", error);
    await cleanupConnection();
    connectionAttempts = 0;
    return await connect();
  }
}