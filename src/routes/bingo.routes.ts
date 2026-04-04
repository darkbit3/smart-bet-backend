import { Router } from 'express';

const router = Router();

// Health check for bingo service
router.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Bingo service is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
