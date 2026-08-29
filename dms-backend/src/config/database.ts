import mongoose from 'mongoose';
import { env } from './env';

/**
 * MongoDB connection options optimized for production.
 */
const MONGO_OPTIONS: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 45_000,
  retryWrites: true,
  retryReads: true,
};

/**
 * Connect to MongoDB with retry logic.
 * Exits the process after max retries — let the process manager restart.
 */
export async function connectDatabase(): Promise<void> {
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 3_000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, MONGO_OPTIONS);
      console.log(`✅ MongoDB connected (attempt ${attempt})`);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${message}`);

      if (attempt === MAX_RETRIES) {
        console.error('💀 Max retries reached. Exiting process.');
        process.exit(1);
      }

      console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

/**
 * Gracefully disconnect from MongoDB.
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  } catch (error) {
    console.error('Error during MongoDB disconnect:', error);
  }
}

/**
 * Register connection event listeners for observability.
 */
export function registerConnectionEvents(): void {
  mongoose.connection.on('connected', () => {
    if (env.NODE_ENV !== 'test') {
      console.log('🟢 Mongoose connection established');
    }
  });

  mongoose.connection.on('error', (err) => {
    console.error('🔴 Mongoose connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    if (env.NODE_ENV !== 'test') {
      console.log('🟡 Mongoose disconnected');
    }
  });
}
