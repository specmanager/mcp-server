#!/usr/bin/env node

/**
 * @specmanager/mcp-server HTTP entry point
 *
 * This is the HTTP/Streamable transport entry point for hosted deployments.
 * API keys are provided per-request via Authorization header or X-API-Key.
 *
 * Environment variables:
 *   SPECMANAGER_API_URL  - Backend API URL (default: https://api.specmanager.ai)
 *   PORT                 - HTTP server port (default: 3000)
 *
 * Usage:
 *   node dist/index-http.js
 *   PORT=8080 node dist/index-http.js
 */

import { MCPServer } from './server.js';

async function main(): Promise<void> {
  const port = parseInt(process.env.PORT || '3000', 10);
  const apiUrl = process.env.SPECMANAGER_API_URL || 'https://api.specmanager.ai';

  console.error(`[MCP Server] Starting HTTP server...`);
  console.error(`[MCP Server] Backend API: ${apiUrl}`);

  try {
    const server = new MCPServer(undefined, {
      useStdio: false,
      port,
      apiUrl,
    });

    await server.start();
  } catch (error) {
    console.error('[MCP Server] Fatal error:', error);
    process.exit(1);
  }
}

main();
