/**
 * Validation Middleware
 * Generic Zod validation middleware for request validation
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Placeholder - will be populated later
    try {
      await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: error.errors
          }
        });
        return;
      }
      next(error);
    }
  };
};