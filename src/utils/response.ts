import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '@/types';

export class ResponseHelper {
  static success<T>(res: Response, data?: T, message?: string, statusCode: number = 200): Response {
    const response: ApiResponse<T> = {
      status: 'success',
      ...(message && { message }),
      ...(data !== undefined && { data }),
    };
    return res.status(statusCode).json(response);
  }

  static error(res: Response, message: string, statusCode: number = 500): Response {
    const response: ApiResponse = {
      status: 'error',
      message,
    };
    return res.status(statusCode).json(response);
  }

  static fail(res: Response, message: string, statusCode: number = 400): Response {
    const response: ApiResponse = {
      status: 'fail',
      message,
    };
    return res.status(statusCode).json(response);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.error(res, message, 401);
  }

  static notFound(res: Response, message: string = 'Not found'): Response {
    return this.error(res, message, 404);
  }

  static serverError(res: Response, message: string = 'Internal server error'): Response {
    return this.error(res, message, 500);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    },
    message?: string,
    statusCode: number = 200,
  ): Response {
    const response: PaginatedResponse<T> = {
      status: 'success',
      message: message || 'Data retrieved successfully',
      data,
      pagination,
    };
    return res.status(statusCode).json(response);
  }
}
