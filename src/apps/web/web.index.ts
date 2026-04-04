import { Router } from 'express';
import { webPlayerAuthRoutes } from './routes/webPlayerAuth';
import { WEB_APP_CONFIG } from '../app.config';

const router = Router();

// Mount web-specific routes
router.use('/auth', webPlayerAuthRoutes);

// Web app info endpoint
router.get('/info', (req, res) => {
  res.json({
    app: WEB_APP_CONFIG.name,
    version: '1.0.0',
    features: WEB_APP_CONFIG.features,
    endpoints: {
      auth: '/auth',
      games: '/games',
      betting: '/betting',
      profile: '/profile'
    }
  });
});

export { router as webRoutes };
