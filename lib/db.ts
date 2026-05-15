import mongoose from 'mongoose';
import type { MongooseCache } from '@/types';

// Import models here to ensure they are registered with Mongoose immediately
import '@/models/User';
import '@/models/HierarchyRole';
import '@/models/Team';
import '@/models/OfficeZone';
import '@/models/GrowthProfile';
import '@/models/GrowthEvent';
import '@/models/QuestProgress';
import '@/models/CoinLedger';
import '@/models/Redemption';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) throw new Error('MONGODB_URI not set in .env.local');

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 50,
      minPoolSize: 5,
      connectTimeoutMS: 10000,
      family: 4 // Use IPv4, skip trying IPv6
    };
    
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    }).catch(err => {
      cached.promise = null; // allow retry
      console.error('MongoDB connection error:', err);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    global.mongooseCache = cached;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  
  return cached.conn;
}
