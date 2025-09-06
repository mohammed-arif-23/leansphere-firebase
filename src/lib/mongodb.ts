import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import mongoose from 'mongoose';

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'leansphere';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Connection options optimized for MongoDB Atlas free tier (native driver)
const options: MongoClientOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

// Global variables to cache the connection
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Connection manager for native MongoDB driver
if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the value across module reloads
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable
  client = new MongoClient(MONGODB_URI, options);
  clientPromise = client.connect();
}

// Get database instance
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(MONGODB_DB);
}

// Mongoose connection manager with retry logic
class MongooseConnectionManager {
  private static instance: MongooseConnectionManager;
  private isConnected = false;
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelay = 1000; // Start with 1 second
  private listenersAttached = false;

  private constructor() {}

  public static getInstance(): MongooseConnectionManager {
    if (!MongooseConnectionManager.instance) {
      MongooseConnectionManager.instance = new MongooseConnectionManager();
    }
    return MongooseConnectionManager.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await mongoose.connect(MONGODB_URI!, {
        dbName: MONGODB_DB,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.isConnected = true;
      this.retryCount = 0;
      console.log('✅ Connected to MongoDB via Mongoose');

      // Avoid accumulating event listeners during dev HMR or reconnects
      if (!this.listenersAttached) {
        // Allow unlimited listeners to avoid MaxListeners warnings in dev
        try { mongoose.connection.setMaxListeners(0); } catch {}
        mongoose.connection.on('error', (error) => {
          console.error('❌ MongoDB connection error:', error);
          this.isConnected = false;
        });
        mongoose.connection.on('disconnected', () => {
          console.log('⚠️ MongoDB disconnected');
          this.isConnected = false;
          this.reconnect();
        });
        this.listenersAttached = true;
      }

    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      this.isConnected = false;
      // Rethrow immediately so callers can surface a clear error
      throw error;
    }
  }

  private async reconnect(): Promise<void> {
    if (!this.isConnected && this.retryCount < this.maxRetries) {
      await this.connect();
    }
  }

  public isMongooseConnected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Export the singleton instance
export const mongooseManager = MongooseConnectionManager.getInstance();

// Helper function to ensure connection
export async function ensureMongooseConnection(): Promise<void> {
  if (!mongooseManager.isMongooseConnected()) {
    await mongooseManager.connect();
  }
}

// Database health check
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    mongodb: boolean;
    mongoose: boolean;
    latency?: number;
  };
}> {
  const startTime = Date.now();
  
  try {
    // Check native MongoDB connection
    const db = await getDatabase();
    await db.admin().ping();
    const mongodbHealthy = true;

    // Check Mongoose connection
    const mongooseHealthy = mongooseManager.isMongooseConnected();

    const latency = Date.now() - startTime;

    return {
      status: mongodbHealthy && mongooseHealthy ? 'healthy' : 'unhealthy',
      details: {
        mongodb: mongodbHealthy,
        mongoose: mongooseHealthy,
        latency,
      },
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      details: {
        mongodb: false,
        mongoose: false,
      },
    };
  }
}

// Export the client promise for direct MongoDB operations
export default clientPromise;
