import { sqliteDB } from '../src/database/sqlite';
import { PlayerService } from '../src/services/player.service';
import bcrypt from 'bcrypt';

async function seed() {
  await sqliteDB.connect();
  
  console.log('Seed script executed - no mock data created');
}

seed().catch(console.error);
