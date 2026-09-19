import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-helpdesk';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info({ uri: MONGODB_URI }, 'Connected to MongoDB');
  } catch (error) {
    logger.error(error, { uri: MONGODB_URI }, 'MongoDB connection failed');
    throw error;
  }
  mongoose.connection.on('error', (err) => logger.error(err, 'MongoDB connection error'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('Disconnected from MongoDB');
}

process.on('SIGINT', async () => { await disconnectDB(); process.exit(0); });
process.on('SIGTERM', async () => { await disconnectDB(); process.exit(0); });

export { mongoose };
