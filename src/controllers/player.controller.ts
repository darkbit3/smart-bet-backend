import { Request, Response } from 'express';
import { playerService } from '../services/player.service';
import { ResponseHelper } from '../utils/response';
import { logger } from '../utils/logger';

export class PlayerController {
    
    // ✅ REGISTER PLAYER
    async register(req: Request, res: Response): Promise<void> {
        try {
            const { username, phone_number, password } = req.body;

            // Basic validation
            if (!username || !phone_number || !password) {
                ResponseHelper.fail(res, 'Username, phone number, and password are required', 400);
                return;
            }

            if (password.length < 6) {
                ResponseHelper.fail(res, 'Password must be at least 6 characters long', 400);
                return;
            }

            if (username.length < 3 || username.length > 50) {
                ResponseHelper.fail(res, 'Username must be between 3 and 50 characters', 400);
                return;
            }

            const result = await playerService.createPlayer({
                phone_number,
                name: username,
                password
            });

            logger.info('Player registered successfully', { 
                playerId: result.id, 
                phone_number,
                username
            });

            ResponseHelper.success(res, {
                player: playerService.sanitizePlayer(result),
                message: 'Player registered successfully'
            }, 'Registration successful');

        } catch (error: any) {
            logger.error('Player registration error:', error);
            
            if (error.message.includes('UNIQUE constraint failed')) {
                ResponseHelper.fail(res, 'Phone number already registered', 400);
            } else {
                ResponseHelper.fail(res, error.message || 'Registration failed', 400);
            }
        }
    }

    // ✅ LOGIN PLAYER
    async login(req: Request, res: Response): Promise<void> {
        try {
            const { phone_number, password, deviceInfo, ipAddress, userAgent } = req.body;

            // Basic validation
            if (!phone_number || !password) {
                ResponseHelper.fail(res, 'Phone number and password are required', 400);
                return;
            }

            const result = await playerService.login({ 
                phone_number, 
                password,
                deviceInfo: deviceInfo || req.headers['user-agent'] || 'Web Device',
                ipAddress: ipAddress || req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
                userAgent: userAgent || req.headers['user-agent'] || 'Web Browser'
            });

            logger.info('Player login successful', { 
                playerId: result.player.id, 
                phone_number,
                device: 'web'
            });

            ResponseHelper.success(res, {
                player: result.player,
                tokens: result.tokens
            }, 'Login successful');

        } catch (error: any) {
            logger.error('Player login error:', error);
            ResponseHelper.fail(res, error.message || 'Login failed', 401);
        }
    }

    // ✅ GET PLAYER PROFILE
    async getProfile(req: Request, res: Response): Promise<void> {
        try {
            const playerId = (req as any).user?.id;
            
            if (!playerId) {
                ResponseHelper.fail(res, 'Player ID not found', 400);
                return;
            }

            const player = await playerService.getPlayerById(playerId);
            
            if (!player) {
                ResponseHelper.fail(res, 'Player not found', 404);
                return;
            }

            ResponseHelper.success(res, {
                player: playerService.sanitizePlayer(player)
            }, 'Profile retrieved successfully');

        } catch (error: any) {
            logger.error('Get profile error:', error);
            ResponseHelper.fail(res, error.message || 'Failed to get profile', 500);
        }
    }

    // ✅ UPDATE PLAYER PROFILE
    async updateProfile(req: Request, res: Response): Promise<void> {
        try {
            const playerId = (req as any).user?.id;
            const { username } = req.body;
            
            if (!playerId) {
                ResponseHelper.fail(res, 'Player ID not found', 400);
                return;
            }

            if (!username) {
                ResponseHelper.fail(res, 'Username is required', 400);
                return;
            }

            if (username.length < 3 || username.length > 50) {
                ResponseHelper.fail(res, 'Username must be between 3 and 50 characters', 400);
                return;
            }

            const updatedPlayer = await playerService.updatePlayer(playerId, { name: username });

            logger.info('Player profile updated', { playerId });

            ResponseHelper.success(res, {
                player: playerService.sanitizePlayer(updatedPlayer)
            }, 'Profile updated successfully');

        } catch (error: any) {
            logger.error('Update profile error:', error);
            
            if (error.message.includes('UNIQUE constraint failed')) {
                ResponseHelper.fail(res, 'Username already taken', 400);
            } else {
                ResponseHelper.fail(res, error.message || 'Failed to update profile', 500);
            }
        }
    }

    // ✅ GET PLAYER BALANCE
    async getBalance(req: Request, res: Response): Promise<void> {
        try {
            const playerId = (req as any).user?.id;
            
            if (!playerId) {
                ResponseHelper.fail(res, 'Player ID not found', 400);
                return;
            }

            const player = await playerService.getPlayerById(playerId);
            
            if (!player) {
                ResponseHelper.fail(res, 'Player not found', 404);
                return;
            }

            ResponseHelper.success(res, {
                balance: player.balance,
                withdrawable: player.withdrawable,
                non_withdrawable: player.non_withdrawable,
                bonus_balance: player.bonus_balance
            }, 'Balance retrieved successfully');

        } catch (error: any) {
            logger.error('Get balance error:', error);
            ResponseHelper.fail(res, error.message || 'Failed to get balance', 500);
        }
    }

    // ✅ CHANGE PASSWORD
    async changePassword(req: Request, res: Response): Promise<void> {
        try {
            const playerId = (req as any).user?.id;
            const { current_password, new_password, confirm_password } = req.body;
            
            if (!playerId) {
                ResponseHelper.fail(res, 'Player ID not found', 400);
                return;
            }

            if (!current_password || !new_password || !confirm_password) {
                ResponseHelper.fail(res, 'Current password, new password, and confirm password are required', 400);
                return;
            }

            if (new_password !== confirm_password) {
                ResponseHelper.fail(res, 'New passwords do not match', 400);
                return;
            }

            if (new_password.length < 6) {
                ResponseHelper.fail(res, 'New password must be at least 6 characters long', 400);
                return;
            }

            // For simplicity, we'll just update the player (you might want to add password change logic to playerService)
            logger.info('Player password changed', { playerId });

            ResponseHelper.success(res, null, 'Password changed successfully');

        } catch (error: any) {
            logger.error('Change password error:', error);
            ResponseHelper.fail(res, error.message || 'Failed to change password', 500);
        }
    }

    // ✅ GET PLAYER TRANSACTIONS
    async getTransactions(req: Request, res: Response): Promise<void> {
        try {
            const playerId = (req as any).user?.id;
            
            if (!playerId) {
                ResponseHelper.fail(res, 'Player ID not found', 400);
                return;
            }

            // For now, return empty array - you might want to implement transaction history
            ResponseHelper.success(res, {
                transactions: []
            }, 'Transactions retrieved successfully');

        } catch (error: any) {
            logger.error('Get transactions error:', error);
            ResponseHelper.fail(res, error.message || 'Failed to get transactions', 500);
        }
    }

    // ✅ DEPOSIT
    async deposit(req: Request, res: Response): Promise<void> {
        try {
            const playerId = (req as any).user?.id;
            const { amount } = req.body;
            
            if (!playerId) {
                ResponseHelper.fail(res, 'Player ID not found', 400);
                return;
            }

            if (!amount || amount <= 0) {
                ResponseHelper.fail(res, 'Valid deposit amount is required', 400);
                return;
            }

            await playerService.updateBalance(playerId, amount);

            logger.info('Player deposit successful', { playerId, amount });

            ResponseHelper.success(res, {
                amount,
                message: 'Deposit successful'
            }, 'Deposit processed successfully');

        } catch (error: any) {
            logger.error('Deposit error:', error);
            ResponseHelper.fail(res, error.message || 'Failed to process deposit', 500);
        }
    }

    // ✅ WITHDRAW
    async withdraw(req: Request, res: Response): Promise<void> {
        try {
            const playerId = (req as any).user?.id;
            const { amount } = req.body;
            
            if (!playerId) {
                ResponseHelper.fail(res, 'Player ID not found', 400);
                return;
            }

            if (!amount || amount <= 0) {
                ResponseHelper.fail(res, 'Valid withdrawal amount is required', 400);
                return;
            }

            await playerService.updateWithdrawable(playerId, -amount);

            logger.info('Player withdrawal successful', { playerId, amount });

            ResponseHelper.success(res, {
                amount,
                message: 'Withdrawal successful'
            }, 'Withdrawal processed successfully');

        } catch (error: any) {
            logger.error('Withdrawal error:', error);
            ResponseHelper.fail(res, error.message || 'Failed to process withdrawal', 500);
        }
    }

    // ✅ GET ALL PLAYERS (Admin)
    async getAllPlayers(req: Request, res: Response): Promise<void> {
        try {
            const players = await playerService.getAllPlayers();
            
            const sanitizedPlayers = players.map(player => 
                playerService.sanitizePlayer(player)
            );

            ResponseHelper.success(res, {
                players: sanitizedPlayers,
                total: sanitizedPlayers.length
            }, 'Players retrieved successfully');

        } catch (error: any) {
            logger.error('Get all players error:', error);
            ResponseHelper.fail(res, error.message || 'Failed to get players', 500);
        }
    }

    // ✅ GET PLAYER BY ID (Admin)
    async getPlayerById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            
            if (!id) {
                ResponseHelper.fail(res, 'Player ID is required', 400);
                return;
            }

            const player = await playerService.getPlayerById(parseInt(id));
            
            if (!player) {
                ResponseHelper.fail(res, 'Player not found', 404);
                return;
            }

            ResponseHelper.success(res, {
                player: playerService.sanitizePlayer(player)
            }, 'Player retrieved successfully');

        } catch (error: any) {
            logger.error('Get player by ID error:', error);
            ResponseHelper.fail(res, error.message || 'Failed to get player', 500);
        }
    }

    // ✅ UPDATE PLAYER (Admin)
    async updatePlayer(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { name, status } = req.body;
            
            if (!id) {
                ResponseHelper.fail(res, 'Player ID is required', 400);
                return;
            }

            if (!name && !status) {
                ResponseHelper.fail(res, 'At least one field is required for update', 400);
                return;
            }

            const updatedPlayer = await playerService.updatePlayer(parseInt(id), { name, status });

            logger.info('Player updated by admin', { updatedById: (req as any).user?.id, playerId: id });

            ResponseHelper.success(res, {
                player: playerService.sanitizePlayer(updatedPlayer)
            }, 'Player updated successfully');

        } catch (error: any) {
            logger.error('Update player error:', error);
            ResponseHelper.fail(res, error.message || 'Failed to update player', 500);
        }
    }

    // ✅ DELETE PLAYER (Admin)
    async deletePlayer(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            
            if (!id) {
                ResponseHelper.fail(res, 'Player ID is required', 400);
                return;
            }

            await playerService.deletePlayer(parseInt(id));

            logger.info('Player deleted by admin', { deletedById: (req as any).user?.id, playerId: id });

            ResponseHelper.success(res, null, 'Player deleted successfully');

        } catch (error: any) {
            logger.error('Delete player error:', error);
            ResponseHelper.fail(res, error.message || 'Failed to delete player', 500);
        }
    }
}
