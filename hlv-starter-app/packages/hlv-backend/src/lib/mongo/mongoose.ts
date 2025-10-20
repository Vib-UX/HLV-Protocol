import mongoose from 'mongoose';
import { serviceLogger } from '../logger';

export async function connectToMongoDB(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri);
    serviceLogger.success('Connected to MongoDB');
  } catch (error) {
    serviceLogger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectFromMongoDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    serviceLogger.info('Disconnected from MongoDB');
  } catch (error) {
    serviceLogger.error('Failed to disconnect from MongoDB:', error);
    throw error;
  }
}

