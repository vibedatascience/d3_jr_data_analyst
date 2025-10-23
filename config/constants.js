/**
 * Configuration Constants
 * Central location for all server configuration
 */

// Server configuration
export const PORT = process.env.PORT || 3001;
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// API configuration
export const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';
export const MAX_TOKENS = 64000;
export const ANTHROPIC_VERSION = '2023-06-01';
export const ANTHROPIC_BETA = 'context-1m-2025-08-07';

// Execution limits
export const MAX_LOOPS = 10;
export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const MAX_TIMEOUT = 60000; // 60 seconds

// API endpoint
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
