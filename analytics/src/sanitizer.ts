/**
 * Parameter sanitization for privacy and security
 * Removes sensitive data and parameterizes values
 */

import type { ErrorType } from './types.js';

/**
 * Sanitize parameters before storing in database
 * Removes sensitive data and parameterizes values
 */
export function sanitizeParameters(params: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!params) return undefined;

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    sanitized[key] = sanitizeValue(key, value);
  }

  return sanitized;
}

/**
 * Sanitize a single value based on key name and value type
 */
function sanitizeValue(key: string, value: any): any {
  // Always remove these sensitive fields
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'api_key',
    'apikey',
    'auth',
    'credential',
    'cookie',
    'session'
  ];

  const lowerKey = key.toLowerCase();
  if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
    return '<redacted>';
  }

  // Handle different value types
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    // Keep numeric values but sanitize IDs if needed
    if (key.toLowerCase().includes('id') && key !== 'limit' && key !== 'offset') {
      return '<id>';
    }
    return value;
  }

  if (typeof value === 'string') {
    // Sanitize string values based on key
    if (key === 'query' || key === 'search' || key === 'q') {
      return '<text>';
    }

    if (key === 'username' || key === 'email' || key === 'user') {
      return '<user>';
    }

    if (value.length > 100) {
      return '<long_text>';
    }

    // Keep short enum-like strings
    if (value.length < 50) {
      return value;
    }

    return '<text>';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [];
    }
    return `<${value.length} items>`;
  }

  if (typeof value === 'object') {
    return '<object>';
  }

  return '<unknown>';
}

/**
 * Sanitize result metadata
 * Keep structure but remove sensitive content
 */
export function sanitizeResultMetadata(metadata: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!metadata) return undefined;

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Keep numeric metrics
    if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
    // Sanitize strings
    else if (typeof value === 'string' && value.length < 50) {
      sanitized[key] = value;
    }
    // Summarize arrays
    else if (Array.isArray(value)) {
      sanitized[key] = { count: value.length };
    }
    // Skip complex objects
    else {
      sanitized[key] = '<omitted>';
    }
  }

  return sanitized;
}

/**
 * Classify error into standard error types
 */
export function classifyError(error: Error | unknown): ErrorType {
  if (!error) return 'unknown';

  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return 'timeout';
  }

  if (errorMessage.includes('network') || errorMessage.includes('econnrefused') || errorMessage.includes('enotfound')) {
    return 'network';
  }

  if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
    return 'auth';
  }

  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return 'not_found';
  }

  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return 'validation';
  }

  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return 'rate_limit';
  }

  if (errorMessage.includes('database') || errorMessage.includes('sql')) {
    return 'database';
  }

  return 'unknown';
}

/**
 * Sanitize error message
 * Remove sensitive info but keep useful debugging info
 */
export function sanitizeErrorMessage(error: Error | unknown): string {
  if (!error) return 'Unknown error';

  const message = error instanceof Error ? error.message : String(error);

  // Remove file paths that might contain usernames
  let sanitized = message.replace(/\/home\/[^\/]+/g, '/home/<user>');
  sanitized = sanitized.replace(/\/Users\/[^\/]+/g, '/Users/<user>');

  // Remove potential tokens or keys (long alphanumeric strings)
  sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, '<token>');

  // Truncate if too long
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500) + '...';
  }

  return sanitized;
}

/**
 * Estimate token count for a value
 * Very rough estimation: ~4 characters per token
 */
export function estimateTokens(value: any): number {
  if (!value) return 0;

  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return Math.ceil(str.length / 4);
}
