import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDatabase = async () => {
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log('MongoDB connected successfully.');
    return true;
  } catch (error) {
    console.warn('MongoDB unavailable. App running with in-memory demo data fallback.', error instanceof Error ? error.message : error);
    return false;
  }
};
