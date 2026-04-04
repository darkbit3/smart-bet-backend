import { Request, Response } from 'express';
import { sqliteDB } from '../database/sqlite';

// Direct database test endpoint
export async function testAvailabilityDirectly(req: Request, res: Response): Promise<void> {
  try {
    const { username } = req.query;
    
    console.log('🔍 Direct Test - Checking username:', username);
    
    if (!username) {
      res.status(400).json({
        success: false,
        message: 'Username parameter is required'
      });
      return;
    }
    
    // Direct database query
    const existing = await sqliteDB.get(
      `SELECT id, username, phone_number FROM players WHERE username = ?`,
      [username]
    );
    
    console.log('🔍 Direct Test - Query result:', existing);
    console.log('🔍 Direct Test - User exists:', !!existing);
    
    const isAvailable = !existing;
    
    res.json({
      success: true,
      data: {
        username: username,
        available: isAvailable,
        found: !!existing,
        existingUser: existing ? {
          id: existing.id,
          username: existing.username,
          phone_number: existing.phone_number
        } : null
      },
      message: `Direct test: Username ${isAvailable ? 'is available' : 'is already taken'}`
    });
    
  } catch (error: any) {
    console.error('❌ Direct Test - Error:', error);
    res.status(500).json({
      success: false,
      message: 'Direct test failed',
      error: error.message
    });
  }
}
