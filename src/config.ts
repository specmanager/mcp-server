import { MCPServerError, ErrorCode } from './types.js';

/**
 * MCP Server configuration
 *
 * Uses the public API with API key authentication.
 * User ID is derived from the API key on the server side.
 */
export interface Config {
  apiUrl: string;
  apiKey: string;
  projectId?: string; // Optional default project
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  const apiUrl = process.env.SPECMANAGER_API_URL || "https://api.specmanager.ai/";
  const apiKey = process.env.SPECMANAGER_API_KEY;
  const projectId = process.env.SPECMANAGER_PROJECT_ID;

  if (!apiUrl) {
    throw new MCPServerError(
      'SPECMANAGER_API_URL environment variable is required',
      ErrorCode.NOT_CONFIGURED
    );
  }

  if (!apiKey) {
    throw new MCPServerError(
      'SPECMANAGER_API_KEY environment variable is required',
      ErrorCode.NOT_CONFIGURED
    );
  }

  return {
    apiUrl: apiUrl.replace(/\/$/, ''), // Remove trailing slash
    apiKey,
    projectId,
  };
}

/**
 * Validate that required configuration is present
 */
export function validateConfig(config: Partial<Config>): config is Config {
  return Boolean(config.apiUrl && config.apiKey);
}
