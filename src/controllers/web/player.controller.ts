import { Request, Response } from 'express';
import { catchAsync } from '@/middleware/errorHandler';
import { ResponseHelper } from '@/utils/response';
import { sqliteDB } from '@/database/sqlite';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { BalanceController } from './balance.controller';

// ⚠️ No Player model here — SQLite only

export class PlayerController {

  // ✅ GET ALL PLAYERS (with pagination)
  static getAllPlayers = catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const status = req.query.status as string;

    const offset = (page - 1) * limit;

    let whereClause = '';
    let params: any[] = [];

    if (status) {
      whereClause = 'WHERE status = ?';
      params.push(status);
    }

    const players = await sqliteDB.all(
      `SELECT * FROM players ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const totalResult = await sqliteDB.get(
      `SELECT COUNT(*) as count FROM players ${whereClause}`,
      params
    );

    const total = totalResult?.count || 0;

    return ResponseHelper.paginated(res, players, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  });

  // ✅ GET PLAYER BY ID
  static getPlayerById = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const player = await sqliteDB.get(
      'SELECT * FROM players WHERE id = ?',
      [id]
    );

    if (!player) {
      return ResponseHelper.fail(res, 'Player not found', 404);
    }

    return ResponseHelper.success(res, player, 'Player retrieved successfully');
  });

  // ✅ CREATE PLAYER
  static createPlayer = catchAsync(async (req: Request, res: Response) => {
    const { username, phone_number, password, created_by } = req.body;

    // Basic validation
    if (!username || !phone_number || !password) {
      return ResponseHelper.fail(res, 'Username, phone number, and password are required', 400);
    }

    // Ethiopian phone number validation (must start with +251 and then 9 or 7)
    const phoneRegex = /^\+251[97]\d{8}$/;
    if (!phoneRegex.test(phone_number)) {
      return ResponseHelper.fail(res, 'Phone number must start with +251 followed by 9 or 7 and 8 more digits (e.g., +251912345678)', 400);
    }

    // Strong password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return ResponseHelper.fail(res, 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character (@$!%*?&)', 400);
    }

    // Check existing
    const existing = await sqliteDB.get(
      `SELECT id FROM players 
       WHERE username = ? OR phone_number = ?`,
      [username, phone_number]
    );

    if (existing) {
      return ResponseHelper.fail(
        res,
        'Username or phone already exists',
        400
      );
    }

    // Hash password for security
    const password_hash = await bcrypt.hash(password, 10);

    await sqliteDB.run(
      `INSERT INTO players (
        username, phone_number, password_hash,
        balance, non_withdrawable, bonus_balance, withdrawable,
        status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, 0, 0, 0, 0, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        username,
        phone_number,
        password_hash, // ✅ Now properly hashed
        created_by || 'admin'
      ]
    );

    const result = await sqliteDB.get(
      'SELECT last_insert_rowid() as id'
    );

    const player = await sqliteDB.get(
      'SELECT * FROM players WHERE id = ?',
      [result.id]
    );

    return ResponseHelper.success(
      res,
      player,
      'Player created successfully',
      201
    );
  });

  // ✅ UPDATE PLAYER
  static updatePlayer = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const updates = req.body;

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return ResponseHelper.fail(res, 'No data to update', 400);
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = Object.values(updates);

    await sqliteDB.run(
      `UPDATE players SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );

    const player = await sqliteDB.get(
      'SELECT * FROM players WHERE id = ?',
      [id]
    );

    if (!player) {
      return ResponseHelper.fail(res, 'Player not found', 404);
    }

    return ResponseHelper.success(res, player, 'Player updated successfully');
  });

  // ✅ DELETE PLAYER
  static deletePlayer = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const player = await sqliteDB.get(
      'SELECT id FROM players WHERE id = ?',
      [id]
    );

    if (!player) {
      return ResponseHelper.fail(res, 'Player not found', 404);
    }

    await sqliteDB.run(
      'DELETE FROM players WHERE id = ?',
      [id]
    );

    return ResponseHelper.success(res, null, 'Player deleted successfully');
  });

  // ✅ UPDATE BALANCE
  static updateBalance = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { non_withdrawable, bonus_balance, withdrawable } = req.body;

    const player = await sqliteDB.get(
      'SELECT * FROM players WHERE id = ?',
      [id]
    );

    if (!player) {
      return ResponseHelper.fail(res, 'Player not found', 404);
    }

    const newNonWithdrawable = non_withdrawable ?? player.non_withdrawable;
    const newBonus = bonus_balance ?? player.bonus_balance;
    const newWithdrawable = withdrawable ?? player.withdrawable;
    const total = newNonWithdrawable + newBonus + newWithdrawable;

    await sqliteDB.run(
      `UPDATE players 
       SET non_withdrawable = ?, bonus_balance = ?, withdrawable = ?, balance = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newNonWithdrawable, newBonus, newWithdrawable, total, id]
    );

    const updated = await sqliteDB.get(
      'SELECT * FROM players WHERE id = ?',
      [id]
    );

    return ResponseHelper.success(res, updated, 'Balance updated successfully');
  });

  // ✅ GET BALANCE
  static getPlayerBalance = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const player = await sqliteDB.get(
      `SELECT balance, non_withdrawable, bonus_balance, withdrawable 
       FROM players WHERE id = ?`,
      [id]
    );

    if (!player) {
      return ResponseHelper.fail(res, 'Player not found', 404);
    }

    return ResponseHelper.success(res, player, 'Balance retrieved');
  });

  // ✅ CHANGE STATUS
  static changePlayerStatus = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended', 'banned'].includes(status)) {
      return ResponseHelper.fail(res, 'Invalid status', 400);
    }

    await sqliteDB.run(
      `UPDATE players 
       SET status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, id]
    );

    const player = await sqliteDB.get(
      'SELECT * FROM players WHERE id = ?',
      [id]
    );

    if (!player) {
      return ResponseHelper.fail(res, 'Player not found', 404);
    }

    return ResponseHelper.success(res, player, 'Status updated successfully');
  });

  // ✅ GET PLAYERS BY CASHIER
  static getPlayersByCashier = catchAsync(async (req: Request, res: Response) => {
    // Get cashier user from token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHelper.fail(res, 'Access token required', 401);
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      return ResponseHelper.fail(res, 'Invalid or expired token', 401);
    }

    const cashierUsername = decoded.username;

    console.log(`Fetching players for cashier: ${cashierUsername}`); // Debug log

    // Get players created by this cashier
    const players = await sqliteDB.all(
      'SELECT id, username, phone_number, balance, withdrawable, non_withdrawable, bonus_balance, status, created_at, created_by FROM players WHERE created_by = ? ORDER BY created_at DESC',
      [cashierUsername]
    );

    // Format players for frontend
    const formattedPlayers = players.map(player => ({
      id: player.id,
      name: player.username,
      username: player.username,
      phoneNumber: player.phone_number,
      balance: player.balance,
      withdrawable: player.withdrawable,
      non_withdrawable: player.non_withdrawable,
      bonusBalance: player.bonus_balance,
      status: player.status,
      createdAt: player.created_at,
      createdBy: player.created_by // Include createdBy in response
    }));

    console.log(`Found ${formattedPlayers.length} players for cashier ${cashierUsername}`); // Debug log

    return ResponseHelper.success(res, {
      players: formattedPlayers,
      total: formattedPlayers.length,
      cashier: cashierUsername
    }, 'Players retrieved successfully');
  });

  // ✅ CREATE NEW PLAYER (for cashier)
  static createPlayerByCashier = catchAsync(async (req: Request, res: Response) => {
    // Get cashier user from token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHelper.fail(res, 'Access token required', 401);
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      return ResponseHelper.fail(res, 'Invalid or expired token', 401);
    }

    const cashierUsername = decoded.username;
    const { username, phoneNumber, password, initialBalance = 0 } = req.body;

    console.log(`Creating player ${username} for cashier ${cashierUsername}`); // Debug log

    // Validation
    if (!username || !phoneNumber || !password) {
      return ResponseHelper.fail(res, 'Username, phone number, and password are required', 400);
    }

    // Check if username exists
    const existingUsername = await sqliteDB.get(
      'SELECT id FROM players WHERE username = ?',
      [username]
    );
    
    if (existingUsername) {
      return ResponseHelper.fail(res, 'Username already taken', 400);
    }

    // Check if phone number exists
    const existingPhone = await sqliteDB.get(
      'SELECT id FROM players WHERE phone_number = ?',
      [phoneNumber]
    );
    
    if (existingPhone) {
      return ResponseHelper.fail(res, 'Phone number already registered', 400);
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Set default balances
    const balance = parseFloat(initialBalance.toString()) || 0;
    const withdrawable = balance * 0.8; // 80% withdrawable
    const non_withdrawable = balance * 0.2; // 20% non-withdrawable
    const bonus_balance = 0;

    // Insert player
    await sqliteDB.run(
      `INSERT INTO players 
       (username, phone_number, password_hash, balance, withdrawable, non_withdrawable, bonus_balance, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, phoneNumber, password_hash, balance, withdrawable, non_withdrawable, bonus_balance, cashierUsername]
    );

    // Get inserted player
    const result = await sqliteDB.get(
      'SELECT last_insert_rowid() as id'
    );

    const newPlayer = await sqliteDB.get(
      'SELECT id, username, phone_number, balance, withdrawable, non_withdrawable, bonus_balance, status, created_at FROM players WHERE id = ?',
      [result.id]
    );

    logger.info(`Player created by cashier ${cashierUsername}: ${username}`);

    return ResponseHelper.success(res, {
      player: {
        id: newPlayer.id,
        name: newPlayer.username,
        username: newPlayer.username,
        phoneNumber: newPlayer.phone_number,
        balance: newPlayer.balance,
        withdrawable: newPlayer.withdrawable,
        nonWithdrawable: newPlayer.non_withdrawable,
        bonusBalance: newPlayer.bonus_balance,
        status: newPlayer.status,
        createdAt: newPlayer.created_at,
        createdBy: cashierUsername
      }
    }, `Player ${username} created successfully by cashier ${cashierUsername}`);
  });

  // ✅ CHECK USERNAME AVAILABILITY
  static checkUsernameAvailability = catchAsync(async (req: Request, res: Response) => {
    const { username } = req.query;

    if (!username || typeof username !== 'string' || username.length < 3) {
      return ResponseHelper.fail(res, 'Username must be at least 3 characters long', 400);
    }

    // Check if username exists in database
    const existingUser = await sqliteDB.get(
      'SELECT id FROM players WHERE username = ?',
      [username]
    );

    if (existingUser) {
      return ResponseHelper.success(res, {
        available: false,
        message: 'Username exists'
      }, 'Username checked');
    }

    return ResponseHelper.success(res, {
      available: true,
      message: 'Username available'
    }, 'Username checked');
  });

  // ✅ CHECK PHONE NUMBER AVAILABILITY
  static checkPhoneAvailability = catchAsync(async (req: Request, res: Response) => {
    const { phone } = req.query;

    if (!phone || typeof phone !== 'string') {
      return ResponseHelper.fail(res, 'Phone number is required', 400);
    }

    // Remove country code and spaces for validation
    const cleanPhone = phone.replace(/\+251|\s/g, '');
    
    // Validate Ethiopian phone format
    if (cleanPhone.length !== 9) {
      return ResponseHelper.fail(res, 'Phone number must be 9 digits', 400);
    }

    if (!cleanPhone.startsWith('9') && !cleanPhone.startsWith('7')) {
      return ResponseHelper.fail(res, 'Ethiopian phone numbers must start with 9 or 7', 400);
    }

    // Check if phone exists in database (both formats)
    const existingPhone = await sqliteDB.get(
      'SELECT id FROM players WHERE phone_number = ? OR phone_number = ?',
      [phone, cleanPhone]
    );

    if (existingPhone) {
      return ResponseHelper.success(res, {
        available: false,
        message: 'Phone number exists'
      }, 'Phone number checked');
    }

    return ResponseHelper.success(res, {
      available: true,
      message: 'Phone number available'
    }, 'Phone number checked');
  });

  // ✅ DEPOSIT TO PLAYER
  static depositToPlayer = catchAsync(async (req: Request, res: Response) => {
    // Get cashier user from token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHelper.fail(res, 'Access token required', 401);
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      return ResponseHelper.fail(res, 'Invalid or expired token', 401);
    }

    const cashierUsername = decoded.username;
    const { phoneNumber, amount } = req.body;

    console.log(`Depositing ${amount} to ${phoneNumber} by cashier ${cashierUsername}`);

    // Validation
    if (!phoneNumber || !amount) {
      return ResponseHelper.fail(res, 'Phone number and amount are required', 400);
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return ResponseHelper.fail(res, 'Amount must be a positive number', 400);
    }

    // Find player by phone number (with normalization)
    let normalizedPhone = phoneNumber;
    if (phoneNumber.startsWith('09')) {
      // Convert 09xxxxxxxx to +2519xxxxxxxx
      normalizedPhone = '+251' + phoneNumber.substring(1);
    } else if (phoneNumber.startsWith('9') && phoneNumber.length === 9) {
      // Convert 9xxxxxxxx to +2519xxxxxxxx
      normalizedPhone = '+251' + phoneNumber;
    }
    
    console.log(`Looking for player with phone: ${phoneNumber} -> normalized to ${normalizedPhone}`);
    
    const player = await sqliteDB.get(
      'SELECT * FROM players WHERE phone_number = ?',
      [normalizedPhone]
    );

    if (!player) {
      return ResponseHelper.fail(res, 'Player not found with this phone number', 404);
    }

    // Get cashier information
    const cashier = await sqliteDB.get(
      'SELECT * FROM cashier_users WHERE username = ?',
      [cashierUsername]
    );

    if (!cashier) {
      return ResponseHelper.fail(res, 'Cashier not found', 404);
    }

    // Calculate new balances
    const oldPlayerBalance = player.balance;
    const oldNonWithdrawable = player.non_withdrawable;
    const oldWithdrawable = player.withdrawable;
    
    // Entire amount goes to non-withdrawable balance (100%)
    const newNonWithdrawable = oldNonWithdrawable + amount;
    const newWithdrawable = oldWithdrawable; // No change to withdrawable
    const newPlayerBalance = newNonWithdrawable + newWithdrawable + player.bonus_balance;

    const oldCashierBalance = cashier.balance || 0;
    const newCashierBalance = oldCashierBalance - amount;

    // Check cashier balance
    if (newCashierBalance < 0) {
      return ResponseHelper.fail(res, 'Insufficient cashier balance', 400);
    }

    try {
      // Start transaction - Update player balance
      const playerUpdateResult = await sqliteDB.run(
        `UPDATE players 
         SET balance = ?, withdrawable = ?, non_withdrawable = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newPlayerBalance, newWithdrawable, newNonWithdrawable, player.id]
      );

      // Update cashier balance
      const cashierUpdateResult = await sqliteDB.run(
        `UPDATE cashier_users 
         SET balance = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newCashierBalance, cashier.id]
      );

      // Create transaction record in transactions table
      const transactionResult = await sqliteDB.run(
        `INSERT INTO transactions (phone_number, amount, type, status, reference, created_at)
         VALUES (?, ?, 'deposit', 'completed', NULL, CURRENT_TIMESTAMP)`,
        [normalizedPhone, newPlayerBalance - oldPlayerBalance]
      );

      // Create cashier transaction record with correct structure
      const cashierTransactionResult = await sqliteDB.run(
        `INSERT INTO cashier_transactions (cashier_id, player_id, transaction_type, amount, balance_before, balance_after, status)
         VALUES (?, ?, 'deposit', ?, ?, ?, 'completed')`,
        [cashier.id, player.id, amount, oldCashierBalance, newCashierBalance]
      );

      logger.info(`Deposit completed: ${amount} to ${phoneNumber} by ${cashierUsername}`, {
        playerUpdateId: playerUpdateResult.lastID,
        cashierUpdateId: cashierUpdateResult.lastID,
        transactionId: transactionResult.lastID,
        cashierTransactionId: cashierTransactionResult.lastID
      });
    } catch (error) {
      console.error('Deposit database error:', error);
      throw error;
    }

    // Get updated player info
    const updatedPlayer = await sqliteDB.get(
      'SELECT * FROM players WHERE id = ?',
      [player.id]
    );

    logger.info(`Deposit completed: ${amount} to ${phoneNumber} by ${cashierUsername} (100% non-withdrawable)`);

    // 📢 Send real-time balance update to player's betting app
    BalanceController.notifyBalanceUpdate(normalizedPhone, {
      type: 'deposit',
      amount: amount,
      player: {
        id: updatedPlayer.id,
        username: updatedPlayer.username,
        phone_number: updatedPlayer.phone_number,
        balance: updatedPlayer.balance,
        withdrawable: updatedPlayer.withdrawable,
        non_withdrawable: updatedPlayer.non_withdrawable,
        bonus_balance: updatedPlayer.bonus_balance,
        status: updatedPlayer.status,
        updated_at: updatedPlayer.updated_at
      },
      cashier: {
        id: cashier.id,
        username: cashierUsername,
        new_balance: newCashierBalance
      },
      timestamp: new Date().toISOString()
    });

    return ResponseHelper.success(res, {
      player: {
        id: updatedPlayer.id,
        name: updatedPlayer.username,
        username: updatedPlayer.username,
        phoneNumber: updatedPlayer.phone_number,
        balance: updatedPlayer.balance,
        withdrawable: updatedPlayer.withdrawable,
        non_withdrawable: updatedPlayer.non_withdrawable,
        bonus_balance: updatedPlayer.bonus_balance,
        status: updatedPlayer.status,
        created_at: updatedPlayer.created_at,
        updated_at: updatedPlayer.updated_at
      },
      cashier_balance: newCashierBalance,
      deposit_amount: amount,
      deposit_split: {
        withdrawable: 0,
        non_withdrawable: amount,
        total: amount
      }
    }, 'Deposit successful');
  });

  // ✅ SEARCH PLAYERS BY CASHIER
  static searchPlayersByCashier = catchAsync(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseHelper.fail(res, 'Access token required', 401);
      return;
    }

    const token = authHeader.substring(7);
    
    // Verify token manually since we don't have access to cashierLoginService
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      const searchTerm = req.query.q as string;

      if (!searchTerm || searchTerm.length < 2) {
        ResponseHelper.success(res, { players: [] }, 'Search term too short');
        return;
      }
      
      // Search players created by this cashier with partial phone number matching
      // Handle different input formats for better matching
      let searchPatterns = [searchTerm]; // Always include the original search term
      
      if (searchTerm.startsWith('09')) {
        // For 09xxxxxxxx format, create +251 format
        const plus251Format = '+251' + searchTerm.substring(1);
        searchPatterns.push(plus251Format);
        
        // Also create patterns for different positions
        const digits = searchTerm.substring(2); // Remove 09
        searchPatterns.push(digits); // Last 8 digits
        // Also check for partial matches within the phone number
        for (let i = 0; i <= digits.length - 6; i++) {
          searchPatterns.push(digits.substring(i, i + 6));
        }
      } else if (searchTerm.startsWith('+2519')) {
        // For +2519xxxxxxxx format, convert to 09xxxxxxxx and apply same logic
        const converted = '09' + searchTerm.substring(5);
        searchPatterns.push(converted);
        const digits = converted.substring(2);
        for (let i = 0; i <= digits.length - 6; i++) {
          searchPatterns.push(digits.substring(i, i + 6));
        }
      } else if (searchTerm.length === 6 && /^\d{6}$/.test(searchTerm)) {
        // For exactly 6 digits, search for this pattern anywhere in phone number
        searchPatterns.push(searchTerm);
        // Also search with +251 prefix
        searchPatterns.push('+251' + searchTerm);
      }
      
      // Build dynamic WHERE clause with multiple LIKE conditions
      const whereConditions = ['created_by = ?'];
      const params = [decoded.username];
      
      // Add all search patterns with OR conditions
      const phoneConditions = [];
      searchPatterns.forEach((pattern, index) => {
        phoneConditions.push('(username LIKE ? OR phone_number LIKE ? OR phone_number = ?)');
        params.push(`%${pattern}%`, `%${pattern}%`, pattern);
      });
      
      if (phoneConditions.length > 0) {
        whereConditions.push(`(${phoneConditions.join(' OR ')})`);
      }
      
      const players = await sqliteDB.all(
        `SELECT * FROM players 
         WHERE ${whereConditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT 10`,
        params
      );

      ResponseHelper.success(res, { 
        players: players.map(player => ({
          id: player.id,
          username: player.username,
          phone_number: player.phone_number,
          balance: player.balance,
          withdrawable: player.withdrawable,
          non_withdrawable: player.non_withdrawable,
          bonus_balance: player.bonus_balance,
          status: player.status,
          created_at: player.created_at,
          updated_at: player.updated_at
        }))
      }, 'Players found');

    } catch (error: any) {
      logger.error('Search players error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        ResponseHelper.fail(res, 'Invalid or expired token', 401);
      } else {
        ResponseHelper.fail(res, error.message || 'Failed to search players', 500);
      }
    }
  });

  // ✅ WITHDRAW FROM PLAYER
  static withdrawFromPlayer = catchAsync(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseHelper.fail(res, 'Access token required', 401);
      return;
    }

    const token = authHeader.substring(7);
    
    // Verify token manually
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      const { phoneNumber, amount } = req.body;

      if (!phoneNumber || !amount || amount <= 0) {
        ResponseHelper.fail(res, 'Phone number and amount are required', 400);
        return;
      }

      // Get player
      const player = await sqliteDB.get(
        'SELECT * FROM players WHERE phone_number = ?',
        [phoneNumber]
      );

      if (!player) {
        return ResponseHelper.fail(res, 'Player not found', 404);
      }

      // Check if player was created by this cashier
      if (player.created_by !== decoded.username) {
        return ResponseHelper.fail(res, 'You can only withdraw from players you created', 403);
      }

      // Check if player has sufficient withdrawable balance
      if (player.withdrawable < amount) {
        return ResponseHelper.fail(res, 'Insufficient withdrawable balance', 400);
      }

      // Get cashier
      const cashier = await sqliteDB.get(
        'SELECT * FROM cashier_users WHERE username = ?',
        [decoded.username]
      );

      if (!cashier) {
        return ResponseHelper.fail(res, 'Cashier not found', 404);
      }

      // Calculate new balances
      const oldPlayerBalance = player.balance;
      const oldWithdrawable = player.withdrawable;
      const newWithdrawable = oldWithdrawable - amount;
      const newPlayerBalance = player.non_withdrawable + newWithdrawable + player.bonus_balance;

      const oldCashierBalance = cashier.balance || 0;
      const newCashierBalance = oldCashierBalance + amount;

      // Update player balance
      await sqliteDB.run(
        `UPDATE players 
         SET balance = ?, withdrawable = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newPlayerBalance, newWithdrawable, player.id]
      );

      // Update cashier balance
      await sqliteDB.run(
        `UPDATE cashier_users 
         SET balance = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newCashierBalance, cashier.id]
      );

      // Create transaction record in transactions table
      await sqliteDB.run(
        `INSERT INTO transactions (phone_number, amount, type, status, reference, created_at)
         VALUES (?, ?, 'withdrawal', 'completed', NULL, CURRENT_TIMESTAMP)`,
        [phoneNumber, oldPlayerBalance - newPlayerBalance]
      );

      // Create cashier transaction record with correct structure
      await sqliteDB.run(
        `INSERT INTO cashier_transactions (cashier_id, player_id, transaction_type, amount, balance_before, balance_after, status)
         VALUES (?, ?, 'withdrawal', ?, ?, ?, 'completed')`,
        [cashier.id, player.id, amount, oldCashierBalance, newCashierBalance]
      );

      // Get updated player info
      const updatedPlayer = await sqliteDB.get(
        'SELECT * FROM players WHERE id = ?',
        [player.id]
      );

      logger.info(`Withdrawal completed: ${amount} from ${phoneNumber} by ${decoded.username}`);

      return ResponseHelper.success(res, {
        player: {
          id: updatedPlayer.id,
          name: updatedPlayer.username,
          username: updatedPlayer.username,
          phoneNumber: updatedPlayer.phone_number,
          balance: updatedPlayer.balance,
          withdrawable: updatedPlayer.withdrawable,
          non_withdrawable: updatedPlayer.non_withdrawable,
          bonus_balance: updatedPlayer.bonus_balance,
          status: updatedPlayer.status,
          created_at: updatedPlayer.created_at,
          updated_at: updatedPlayer.updated_at
        },
        cashier_balance: newCashierBalance,
        withdraw_amount: amount
      }, 'Withdrawal successful');

    } catch (error: any) {
      logger.error('Withdraw error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        ResponseHelper.fail(res, 'Invalid or expired token', 401);
      } else {
        ResponseHelper.fail(res, error.message || 'Failed to withdraw from player', 500);
      }
    }
  });

  // ✅ CHECK PHONE NUMBER EXISTS
  static checkPhoneExists = catchAsync(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseHelper.fail(res, 'Access token required', 401);
      return;
    }

    const token = authHeader.substring(7);
    
    // Verify token manually
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      const phoneNumber = req.query.phone as string;

      if (!phoneNumber) {
        ResponseHelper.fail(res, 'Phone number is required', 400);
        return;
      }

      // Normalize phone number format
      let normalizedPhone = phoneNumber;
      if (phoneNumber.startsWith('+2519')) {
        // Keep +2519 format as is (stored in database)
        normalizedPhone = phoneNumber;
      } else if (phoneNumber.startsWith('09')) {
        // Convert 09xxxxxxxx to +2519xxxxxxxx
        normalizedPhone = '+251' + phoneNumber.substring(1);
      } else if (phoneNumber.startsWith('9') && phoneNumber.length === 9) {
        // Convert 9xxxxxxxx to +2519xxxxxxxx
        normalizedPhone = '+251' + phoneNumber;
      }

      // Check if phone number exists in players table
      const player = await sqliteDB.get(
        'SELECT * FROM players WHERE phone_number = ?',
        [normalizedPhone]
      );

      if (player) {
        // Check if player was created by this cashier
        const isOwnPlayer = player.created_by === decoded.username;
        
        ResponseHelper.success(res, {
          exists: true,
          isOwnPlayer: isOwnPlayer,
          player: {
            id: player.id,
            username: player.username,
            phone_number: player.phone_number,
            balance: player.balance,
            withdrawable: player.withdrawable,
            non_withdrawable: player.non_withdrawable,
            bonus_balance: player.bonus_balance,
            status: player.status,
            created_at: player.created_at,
            created_by: player.created_by
          }
        }, 'Phone number exists');
      } else {
        ResponseHelper.success(res, {
          exists: false,
          isOwnPlayer: false,
          player: null
        }, 'Phone number does not exist');
      }

    } catch (error: any) {
      logger.error('Check phone exists error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        ResponseHelper.fail(res, 'Invalid or expired token', 401);
      } else {
        ResponseHelper.fail(res, error.message || 'Failed to check phone number', 500);
      }
    }
  });
}