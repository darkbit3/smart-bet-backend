import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { dbManager } from './database/databaseManager';

// Import routes (will be updated when you provide new code)
import routes, { createCashoutAgentRoutes } from './routes';
import { cashierRoutes } from './apps/cashier/cashier.index';
import { Database } from 'sqlite3';

dotenv.config();

class Application {
  public app: express.Application;
  public server: any;
  private cashoutAgentRoutes: any;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    /**
     * ✅ FIXED CORS CONFIG
     */
    const allowedOrigins = [
      ...config.cors.origins,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:5176',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://smart-bet-cashier.onrender.com',
      'https://smart-bet-admin.onrender.com',
      'https://smart-gp9rs1r92-kaleabs-projects-1bd541ea.vercel.app',
      'https://smart-bet-chi.vercel.app',
      'https://smart-bet-owof.onrender.com'
    ];

    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like Postman or mobile apps)
        if (!origin) return callback(null, true);

        // Check if origin is allowed
        const isAllowed = allowedOrigins.some(allowed =>
          allowed === origin ||
          (allowed.includes('localhost') && origin.includes('localhost')) ||
          (allowed.includes('127.0.0.1') && origin.includes('127.0.0.1'))
        );

        if (isAllowed) {
          return callback(null, true);
        } else {
          logger.warn(`❌ CORS blocked origin: ${origin}`);
          return callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'X-Content-Type-Options', 'X-Frame-Options', 'X-XSS-Protection'],
    }));

    /**
     * ✅ HANDLE PREFLIGHT (VERY IMPORTANT)
     */
    this.app.options('*', cors());

    /**
     * Security middleware
     */
    this.app.use(helmet());

    /**
     * Compression
     */
    this.app.use(compression());

    /**
     * Body parsing
     */
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    /**
     * Logging
     */
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim())
      }
    }));

    /**
     * Rate limiting
     */
    this.app.use(rateLimiter);
  }

  private initializeRoutes(): void {
    /**
     * Health check
     */
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'success',
        message: 'Multi-app backend server is running',
        port: config.port,
        environment: config.env,
        timestamp: new Date().toISOString(),
        apps: {
          web: '/api',
          cashier: '/api'
        }
      });
    });

    /**
     * 🆕 New organized routes
     */
    this.app.use('/api', routes);
    this.app.use('/api/web', routes); // Alias for web frontend
    this.app.use('/api/cashier', cashierRoutes);

    /**
     * Apps info endpoint
     */
    this.app.get('/api/apps', (req, res) => {
      res.json({
        web: {
          name: 'Smart Bet Web',
          prefix: '/api',
          features: {
            authentication: true,
            singleDeviceLogin: true,
            sessionTimeout: '24 hours',
            inactivityTimeout: '5 minutes'
          }
        },
        cashier: {
          name: 'Smart Bet Cashier',
          prefix: '/api',
          features: {
            authentication: true,
            singleDeviceLogin: false,
            sessionTimeout: '8 hours',
            inactivityTimeout: '30 minutes'
          }
        }
      });
    });

    /**
     * Docs (dev only)
     */
    if (config.env === 'development') {
      this.app.get('/api/docs', (req, res) => {
        res.json({
          message: 'Multi-app API Documentation',
          version: '1.0.0',
          apps: {
            web: {
              prefix: '/api/web',
              description: 'Smart Bet Web Application',
              features: ['Single device login', '24h session timeout', '5min inactivity timeout']
            },
            cashier: {
              prefix: '/api/cashier',
              description: 'Smart Bet Cashier Application',
              features: ['Multiple device login', '8h session timeout', '30min inactivity timeout']
            }
          },
          legacy: {
            prefix: '/api',
            description: 'Legacy API endpoints (for backward compatibility)'
          }
        });
      });
    }
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      try {
        await dbManager.connect();
        logger.info(`Database connected successfully`);

        // Update cashout agent routes with database connection
        if (this.cashoutAgentRoutes && this.cashoutAgentRoutes.setDatabase) {
          this.cashoutAgentRoutes.setDatabase(dbManager.getSQLite().getRawDatabase());
          logger.info('Cashout agent database reference updated');
        }
      } catch (dbError: any) {
        logger.warn('Database connection failed:', dbError.message);
      }

      this.server.listen(config.port, config.host, () => {
        logger.info(`🚀 Multi-app Server running on http://${config.host}:${config.port}`);
        logger.info(`📱 Web App API: http://${config.host}:${config.port}/api/web`);
        logger.info(`💰 Cashier App API: http://${config.host}:${config.port}/api/cashier`);
        logger.info(`🔄 Legacy API: http://${config.host}:${config.port}/api`);
        logger.info(`📚 API Docs: http://${config.host}:${config.port}/api/docs`);
      });

    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down gracefully...');

    this.server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Force closing application');
      process.exit(1);
    }, 10000);
  }
}

const app = new Application();

process.on('SIGTERM', () => app.shutdown());
process.on('SIGINT', () => app.shutdown());

app.start().catch((error) => {
  logger.error('Application startup failed:', error);
  process.exit(1);
});

export default app;