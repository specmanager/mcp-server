#!/usr/bin/env node

/**
 * @specmanager/mcp-server - Task execution MCP server for Claude Code
 *
 * This is the stdio entry point for local use with npx or direct installation.
 * For HTTP transport, use index-http.ts or run with --http flag.
 *
 * Environment variables:
 *   SPECMANAGER_API_URL     - Backend API URL (default: https://api.specmanager.ai)
 *   SPECMANAGER_API_KEY     - API key for authentication (required)
 *   SPECMANAGER_PROJECT_ID  - Default project ID (optional)
 */

import { loadConfig } from './config.js';
import { MCPServer } from './server.js';

async function main(): Promise<void> {
  try {
    // Check for --http flag
    const useHttp = process.argv.includes('--http');
    const portArg = process.argv.find(arg => arg.startsWith('--port='));
    const port = portArg ? parseInt(portArg.split('=')[1], 10) : 3000;

    if (useHttp) {
      // HTTP mode - API key comes per-request
      const server = new MCPServer(undefined, {
        useStdio: false,
        port,
        apiUrl: process.env.SPECMANAGER_API_URL || 'https://api.specmanager.ai'
      });
      await server.start();
    } else {
      // Stdio mode - requires API key from environment
      const config = loadConfig();
      const server = new MCPServer(config, { useStdio: true });
      await server.start();
    }
  } catch (error) {
    console.error('[MCP Server] Fatal error:', error);
    process.exit(1);
  }
}

main();
