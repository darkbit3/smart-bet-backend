// Common types used across the application

export interface ApiResponse<T = any> {
  status: 'success' | 'fail' | 'error';
  message?: string | undefined;
  data?: T;
  error?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message: string; // Make message required for PaginatedResponse
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  balance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BettingEvent {
  id: string;
  name: string;
  sport: string;
  startTime: Date;
  status: 'upcoming' | 'live' | 'finished' | 'cancelled';
  odds: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bet {
  id: string;
  userId: string;
  eventId: string;
  type: string;
  selection: string;
  odds: number;
  stake: number;
  potentialWinnings: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  id: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}
