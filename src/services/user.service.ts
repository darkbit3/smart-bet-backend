import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { dbManager } from '../database/databaseManager';

export class UserController {
  // ✅ Check username availability
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
      console.error('❌ checkUsernameAvailability error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // ✅ CHANGE USERNAME (FULLY SAFE VERSION)
  static async changeUsername(req: AuthenticatedRequest, res: Response) {
    try {
      const { newUsername, currentPassword } = req.body;
      const userId = req.user?.id;

      console.log('📨 Request:', {
        userId,
        newUsername,
        hasPassword: !!currentPassword
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

      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required'
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

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // 🔑 GET PASSWORD SAFELY (handles both tables)
      const passwordHash =
        currentUser.password_hash ||
        currentUser.password ||
        null;

      console.log('🔑 Password hash value:', passwordHash);

      // ❌ No password
      if (!passwordHash) {
        return res.status(400).json({
          success: false,
          message: 'User password not found'
        });
      }

      // ❌ Not bcrypt hash (CRITICAL FIX)
      if (typeof passwordHash !== 'string' || !passwordHash.startsWith('$2')) {
        console.log('❌ Invalid bcrypt hash format');

        return res.status(400).json({
          success: false,
          message: 'Stored password is not properly hashed'
        });
      }

      // 🔐 Compare password safely
      let isPasswordValid = false;

      try {
        isPasswordValid = await bcrypt.compare(
          currentPassword,
          passwordHash
        );
      } catch (err) {
        console.error('❌ bcrypt error:', err);

        return res.status(500).json({
          success: false,
          message: 'Password verification failed'
        });
      }

      console.log('🔐 Password valid:', isPasswordValid);

      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
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

      // 🔍 Check duplicates
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

      // 📝 Update username
      await sqlite.run(
        `UPDATE ${tableName} SET username = ? WHERE id = ?`,
        [cleanUsername, userId]
      );

      console.log('✅ Username updated');

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