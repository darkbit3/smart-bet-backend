import { Player } from '@/models/web';

export const seedPlayers = async (): Promise<void> => {
  try {
    // NOTE: This seed file is for MongoDB and is not used with SQLite
    // SQLite seeding is handled in sqlite.ts file
    console.log('MongoDB seeding skipped - using SQLite instead');
    
  } catch (error) {
    console.error('Error seeding players:', error);
    throw error;
  }
};
