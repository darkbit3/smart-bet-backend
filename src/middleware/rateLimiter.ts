import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { config } from '../config';

// Create rate limiter
const rateLimiter = new RateLimiterMemory({
  points: config.rateLimit.maxRequests, // Number of requests
  duration: config.rateLimit.windowMs / 1000, // Per number of seconds
  blockDuration: 60, // Block for 60 seconds if limit exceeded
});

// Create stricter rate limiter for authentication endpoints
const authRateLimiter = new RateLimiterMemory({
  points: 5, // Number of requests
  duration: 900, // Per 15 minutes
  blockDuration: 900, // Block for 15 minutes
});

export const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Use stricter rate limiting for auth endpoints
    const limiter = req.originalUrl.includes('/auth') ? authRateLimiter : rateLimiter;
    
    await limiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    
    const message = 'Too many requests from this IP, please try again later';
    const error = new AppError(message, 429);
    next(error);
  }
};

export { rateLimiterMiddleware as rateLimiter };
