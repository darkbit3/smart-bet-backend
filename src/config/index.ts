import dotenv from 'dotenv';

dotenv.config();

// Define environment before config object
const env = process.env.NODE_ENV || 'development';

interface Config {
  env: string;
  port: number;
  host: string;
  
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  
  mongodb: {
    uri: string;
    dbName: string;
  };
  
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  
  cors: {
    origins: string[];
  };
  
  logging: {
    level: string;
    file: string;
  };
  
  upload: {
    maxFileSize: number;
    path: string;
  };
  
  externalApis: {
    betting: {
      apiKey: string;
      url: string;
    };
  };
  
  email?: {
    host: string;
    port: number;
    user: string;
    pass: string;
  } | undefined;
  
  monitoring?: {
    sentryDsn?: string;
  } | undefined;
}

export const config: Config = {
  env,
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'smart_betting',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
  },
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb+srv://kaleabkale58_db_user:ATTRgratoSwNbGoQ@cluster0.skdafnr.mongodb.net/project0?retryWrites=true&w=majority&appName=Cluster0',
    dbName: process.env.MONGODB_DB_NAME || 'project0',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-this',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  cors: {
    origins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:3000').split(','),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    path: process.env.UPLOAD_PATH || 'uploads',
  },
  
  externalApis: {
    betting: {
      apiKey: process.env.BETTING_API_KEY || '',
      url: process.env.BETTING_API_URL || '',
    },
  },
  
  email: process.env.SMTP_HOST ? {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  } : undefined as undefined,
  
  monitoring: process.env.SENTRY_DSN ? {
    sentryDsn: process.env.SENTRY_DSN,
  } : undefined,
};

// Validation
const requiredEnvVars = ['JWT_SECRET'];

if (config.env === 'production') {
  requiredEnvVars.push('DB_PASSWORD');
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
}
