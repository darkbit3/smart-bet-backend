import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { dbManager } from '../database/databaseManager';

export class UserController {
  // ✅ Check if username is available
  static async checkUsernameAvailability(req: Request, res: Response) {
    try {
      const { username } = req.body;

      if (!username || username.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Username must be at least 3 characters long'
        });
      }

      const sqlite = dbManager.getSQLite();
      const cleanUsername = username.trim();

      // Check both tables
      const [existingUser, existingPlayer] = await Promise.all([
        sqlite.get(
          'SELECT id FROM users WHERE username = ? COLLATE NOCASE',
          [cleanUsername]
        ),
        sqlite.get(
          'SELECT id FROM players WHERE username = ? COLLATE NOCASE',
          [cleanUsername]
        )
      ]);

      if (existingUser || existingPlayer) {
        return res.status(200).json({
          success: true,
          available: false,
          message: 'Username is already taken'
        });
      }

      return res.status(200).json({
        success: true,
        available: true,
        message: 'Username is available'
      });

    } catch (error: any) {
      console.error('❌ Error checking username:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // ✅ CHANGE USERNAME (NO PASSWORD REQUIRED)
  static async changeUsername(req: AuthenticatedRequest, res: Response) {
    try {
      const { newUsername } = req.body;
      const userId = req.user?.id;

      console.log('📨 Request:', {
        userId,
        newUsername,
        noPasswordRequired: true
      });

      // 🔐 Auth check
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // 🧾 Validation
      if (!newUsername || newUsername.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Username must be at least 3 characters long'
        });
      }

      const sqlite = dbManager.getSQLite();

      // 👤 Find user in BOTH tables
      let currentUser = await sqlite.get(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      let tableName = 'users';

      if (!currentUser) {
        currentUser = await sqlite.get(
          'SELECT * FROM players WHERE id = ?',
          [userId]
        );
        tableName = 'players';
      }

      console.log('🧠 Table:', tableName);
      console.log('🧠 User:', currentUser);

      // ❌ No user found
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // ❌ Same username
      if (
        newUsername.trim().toLowerCase() ===
        currentUser.username.toLowerCase()
      ) {
        return res.status(400).json({
          success: false,
          message: 'New username must be different'
        });
      }

      const cleanUsername = newUsername.trim().toLowerCase();

      // 🔍 Check duplicates in BOTH tables
      const [existingUser, existingPlayer] = await Promise.all([
        sqlite.get(
          'SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?',
          [cleanUsername, userId]
        ),
        sqlite.get(
          'SELECT id FROM players WHERE username = ? COLLATE NOCASE AND id != ?',
          [cleanUsername, userId]
        )
      ]);

      if (existingUser || existingPlayer) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }

      // ✅ Update username (NO PASSWORD NEEDED)
      await sqlite.run(
        `UPDATE ${tableName} SET username = ? WHERE id = ?`,
        [cleanUsername, userId]
      );

      console.log('✅ Username updated automatically');

      // 📦 Return updated user
      const updatedUser = await sqlite.get(
        `SELECT id, username, phone_number, created_at FROM ${tableName} WHERE id = ?`,
        [userId]
      );

      return res.status(200).json({
        success: true,
        message: 'Username changed successfully',
        user: updatedUser
      });

    } catch (error: any) {
      console.error('❌ changeUsername error:', error);
      console.error('❌ stack:', error?.stack);

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}