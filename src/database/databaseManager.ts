import { sqliteDB } from './sqlite';
import { connectMongoDB, disconnectMongoDB } from './mongodb';
import { logger } from '../utils/logger';

export enum DatabaseType {
  SQLITE = 'sqlite',
  MONGODB = 'mongodb'
}

export class DatabaseManager {
  private currentDB: DatabaseType = DatabaseType.SQLITE;
  private isConnected: boolean = false;

  constructor() {
    // Use SQLite by default
    this.currentDB = DatabaseType.SQLITE;
  }

  // Switch database type
  setDatabaseType(type: DatabaseType): void {
    this.currentDB = type;
    logger.info(`Database type set to: ${type}`);
  }

  // Get current database type
  getDatabaseType(): DatabaseType {
    return this.currentDB;
  }

  // Connect to the selected database
  async connect(): Promise<void> {
    try {
      if (this.currentDB === DatabaseType.SQLITE) {
        await sqliteDB.connect();
        this.isConnected = true;
        logger.info('Connected to SQLite database');
      } else if (this.currentDB === DatabaseType.MONGODB) {
        await connectMongoDB();
        this.isConnected = true;
        logger.info('Connected to MongoDB database');
      }
    } catch (error) {
      logger.error(`Failed to connect to ${this.currentDB}:`, error);
      this.isConnected = false;
      throw error;
    }
  }

  // Disconnect from the current database
  async disconnect(): Promise<void> {
    try {
      if (this.currentDB === DatabaseType.SQLITE) {
        await sqliteDB.close();
        this.isConnected = false;
        logger.info('Disconnected from SQLite database');
      } else if (this.currentDB === DatabaseType.MONGODB) {
        await disconnectMongoDB();
        this.isConnected = false;
        logger.info('Disconnected from MongoDB database');
      }
    } catch (error) {
      logger.error(`Failed to disconnect from ${this.currentDB}:`, error);
      throw error;
    }
  }

  // Check if connected
  isDBConnected(): boolean {
    return this.isConnected;
  }

  // Get health status
  async getHealthStatus(): Promise<{ status: string; database: string }> {
    try {
      if (this.currentDB === DatabaseType.SQLITE) {
        return await sqliteDB.getHealthStatus();
      } else if (this.currentDB === DatabaseType.MONGODB) {
        // MongoDB health check would go here
        return {
          status: this.isConnected ? 'connected' : 'disconnected',
          database: 'MongoDB'
        };
      }
      
      return {
        status: 'unknown',
        database: this.currentDB
      };
    } catch (error) {
      return {
        status: 'error',
        database: this.currentDB
      };
    }
  }

  // Get SQLite instance (for direct access)
  getSQLite() {
    if (this.currentDB === DatabaseType.SQLITE) {
      return sqliteDB;
    }
    throw new Error('SQLite not available when using MongoDB');
  }
}

// Export singleton instance
export const dbManager = new DatabaseManager();
