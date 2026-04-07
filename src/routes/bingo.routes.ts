import { Router } from 'express';
import { BingoController } from '@/controllers/web/bingo.controller';

const router = Router();

// Health check for bingo service
router.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Bingo service is running',
    timestamp: new Date().toISOString()
  });
});

// Handle player connection from smart bet bingo page
router.post('/player-connect', BingoController.handlePlayerConnect);

// Get bingo system status
router.get('/status', BingoController.getBingoStatus);

export default router;
