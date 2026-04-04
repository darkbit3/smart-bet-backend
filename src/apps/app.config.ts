export interface AppConfig {
  name: string;
  prefix: string;
  port?: number;
  corsOrigins: string[];
  rateLimiting: {
    windowMs: number;
    max: number;
  };
  features: {
    authentication: boolean;
    singleDeviceLogin: boolean;
    sessionTimeout: number;
    inactivityTimeout: number;
  };
}

export const WEB_APP_CONFIG: AppConfig = {
  name: 'Smart Bet Web',
  prefix: '/api/web',
  corsOrigins: ['http://localhost:5173', 'http://localhost:3000'],
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  features: {
    authentication: true,
    singleDeviceLogin: true,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    inactivityTimeout: 5 * 60 * 1000 // 5 minutes
  }
};

export const CASHIER_APP_CONFIG: AppConfig = {
  name: 'Smart Bet Cashier',
  prefix: '/api/cashier',
  corsOrigins: ['http://localhost:5174', 'http://localhost:3001'],
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200 // limit each IP to 200 requests per windowMs
  },
  features: {
    authentication: true,
    singleDeviceLogin: false, // Cashier can have multiple sessions
    sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
    inactivityTimeout: 30 * 60 * 1000 // 30 minutes
  }
};
