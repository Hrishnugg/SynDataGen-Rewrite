import { MongoClient, ServerApiVersion, WriteConcern } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
  ssl: true,
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsInsecure: false,
  minPoolSize: 1,
  maxPoolSize: 10,
  retryWrites: true,
  w: 1,
  minTlsVersion: 'TLSv1.2',
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
} as const;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect()
      .then(client => {
        console.log('MongoDB connected successfully in development');
        return client;
      })
      .catch(error => {
        console.error('MongoDB connection error:', error);
        throw error;
      });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect()
    .then(client => {
      console.log('MongoDB connected successfully in production');
      return client;
    })
    .catch(error => {
      console.error('MongoDB connection error:', error);
      throw error;
    });
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export async function testDbConnection() {
  try {
    const client = await clientPromise;
    await client.db().command({ ping: 1 });
    console.log("Database connection test successful");
    return true;
  } catch (error) {
    console.error("Database connection error:", error);
    return false;
  }
}