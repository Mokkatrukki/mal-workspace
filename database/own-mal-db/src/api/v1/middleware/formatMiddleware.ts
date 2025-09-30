/**
 * Format Middleware
 * Handles response format transformation based on ?format query parameter
 */

import { Request, Response, NextFunction } from 'express';
import { ResponseFormat } from '../../types/api';

declare global {
  namespace Express {
    interface Request {
      responseFormat: ResponseFormat;
    }
  }
}

export const formatMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Placeholder - will be populated in Task 6
  const format = req.query.format as string || 'standard';
  req.responseFormat = ['standard', 'clean', 'compact'].includes(format)
    ? format as ResponseFormat
    : 'standard';
  next();
};