import mongoose from 'mongoose';
import { config } from '@/config';
import { logger } from '@/utils/logger';

export const connectMongoDB = async (): Promise<void> => {
  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    
    await mongoose.connect(config.mongodb.uri, options);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    
    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('IP that isn\'t whitelisted')) {
        logger.error('MongoDB Atlas IP whitelist issue detected. Please add your current IP address to the Atlas cluster whitelist.');
      }
      if (error.message.includes('Authentication failed')) {
        logger.error('MongoDB authentication failed. Please check your username and password.');
      }
    }
    
    throw error;
  }
};

export const disconnectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('MongoDB disconnection error:', error);
    throw error;
  }
};

export const checkMongoDBHealth = async () => {
  try {
    const state = mongoose.connection.readyState;
    const states: { [key: number]: string } = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    return {
      status: states[state] || 'unknown',
      database: config.mongodb.dbName,
    };
  } catch (error) {
    return {
      status: 'error',
      database: config.mongodb.dbName,
    };
  }
};
