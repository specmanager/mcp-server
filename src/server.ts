/**
 * MCP Server for task execution
 *
 * Supports two transport modes:
 * - stdio: For local use with Claude Code (npx, direct install)
 * - HTTP: For hosted deployment with per-request API key authentication
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
dotenv.config();

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type { Config } from './config.js';
import { TaskApiClient } from './api/client.js';
import { MCPServerError, ErrorCode } from './types.js';
import {
  toolDefinitions,
  listProjectsSchema,
  handleListProjects,
  listSpecsSchema,
  handleListSpecs,
  listTasksSchema,
  handleListTasks,
  getTaskSchema,
  handleGetTask,
  startTaskSchema,
  handleStartTask,
  completeTaskSchema,
  handleCompleteTask,
  reportProgressSchema,
  handleReportProgress,
} from './tools/index.js';

/**
 * Session data stored per HTTP connection
 */
interface SessionData {
  transport: StreamableHTTPServerTransport;
  apiClient: TaskApiClient;
  server: Server;
}

export interface MCPServerOptions {
  /** Port for HTTP transport (default: 3000) */
  port?: number;
  /** Use stdio transport instead of HTTP */
  useStdio?: boolean;
  /** Backend API URL (used as default for HTTP mode) */
  apiUrl?: string;
}

export class MCPServer {
  private stdioServer?: Server;
  private httpServer?: ReturnType<typeof createServer>;
  private sessions: Map<string, SessionData> = new Map();
  private stdioApiClient?: TaskApiClient;
  private options: MCPServerOptions;
  private defaultApiUrl: string;

  /**
   * Create an MCP server
   * @param config - Required for stdio mode (contains API key), optional for HTTP mode
   * @param options - Server options
   */
  constructor(config?: Config, options: MCPServerOptions = {}) {
    this.options = options;
    this.defaultApiUrl = config?.apiUrl || options.apiUrl || 'https://api.specmanager.ai';

    // For stdio mode, we need a config with API key upfront
    if (options.useStdio) {
      if (!config?.apiKey) {
        throw new MCPServerError(
          'API key is required for stdio mode. Set SPECMANAGER_API_KEY environment variable.',
          ErrorCode.NOT_CONFIGURED
        );
      }
      this.stdioApiClient = new TaskApiClient(config);
    }

    this.setupProcessHandlers();
  }

  /**
   * Create a new MCP Server instance with handlers bound to a specific API client
   */
  private createServerInstance(apiClient: TaskApiClient): Server {
    const server = new Server(
      {
        name: '@specmanager/mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: toolDefinitions };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.handleToolCall(apiClient, name, args || {});
        return {
          content: [{ type: 'text', text: result }],
        };
      } catch (error) {
        const errorMessage = this.formatError(error);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      }
    });

    server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    return server;
  }

  /**
   * Handle individual tool calls
   */
  private async handleToolCall(
    apiClient: TaskApiClient,
    name: string,
    args: Record<string, unknown>
  ): Promise<string> {
    switch (name) {
      case 'list-projects': {
        const input = listProjectsSchema.parse(args);
        return handleListProjects(apiClient, input);
      }

      case 'list-specs': {
        const input = listSpecsSchema.parse(args);
        return handleListSpecs(apiClient, input);
      }

      case 'list-tasks': {
        const input = listTasksSchema.parse(args);
        return handleListTasks(apiClient, input);
      }

      case 'get-task': {
        const input = getTaskSchema.parse(args);
        return handleGetTask(apiClient, input);
      }

      case 'start-task': {
        const input = startTaskSchema.parse(args);
        return handleStartTask(apiClient, input);
      }

      case 'complete-task': {
        const input = completeTaskSchema.parse(args);
        return handleCompleteTask(apiClient, input);
      }

      case 'report-progress': {
        const input = reportProgressSchema.parse(args);
        return handleReportProgress(apiClient, input);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Format errors for MCP response
   */
  private formatError(error: unknown): string {
    if (error instanceof MCPServerError) {
      return `Error [${error.code}]: ${error.message}`;
    }

    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`);
      return `Validation error:\n${issues.join('\n')}`;
    }

    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }

    return 'An unknown error occurred';
  }

  /**
   * Set up process signal handlers
   */
  private setupProcessHandlers(): void {
    process.on('SIGINT', async () => {
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.stop();
      process.exit(0);
    });
  }

  /**
   * Extract API key from request headers
   */
  private extractApiKey(req: Request): string | null {
    // Support multiple header formats
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Direct API key header
    const apiKey = req.headers['x-api-key'];
    if (typeof apiKey === 'string') {
      return apiKey;
    }

    return null;
  }

  /**
   * Initialize HTTP transport with per-request API key authentication
   */
  private async initializeHttpTransport(port: number): Promise<void> {
    const app = express();
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        server: '@specmanager/mcp-server',
        version: '0.1.0',
        transport: 'http'
      });
    });

    // Handle POST requests for MCP messages
    app.post('/mcp', async (req: Request, res: Response) => {
      try {
        // Extract API key from request
        const apiKey = this.extractApiKey(req);
        if (!apiKey) {
          res.status(401).json({
            error: 'Unauthorized',
            message: 'API key required. Provide via Authorization: Bearer <key> or X-API-Key header.'
          });
          return;
        }

        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let sessionData: SessionData;

        if (sessionId && this.sessions.has(sessionId)) {
          // Reuse existing session
          sessionData = this.sessions.get(sessionId)!;
        } else {
          // Create new session with API client for this user's API key
          const apiClient = new TaskApiClient({
            apiUrl: this.defaultApiUrl,
            apiKey: apiKey,
          });

          const server = this.createServerInstance(apiClient);

          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
            onsessioninitialized: (newSessionId) => {
              // Store session data when session is initialized
              this.sessions.set(newSessionId, sessionData);
            }
          });

          sessionData = { transport, apiClient, server };

          transport.onclose = () => {
            if (transport.sessionId) {
              this.sessions.delete(transport.sessionId);
            }
          };

          // Connect the server to this transport
          await server.connect(transport);
        }

        // Handle the request
        await sessionData.transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('[HTTP Transport Error]', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });

    // Handle GET requests for SSE streams
    app.get('/mcp', async (req: Request, res: Response) => {
      const sessionId = req.headers['mcp-session-id'] as string;
      const sessionData = this.sessions.get(sessionId);

      if (!sessionData) {
        res.status(400).json({ error: 'No active session' });
        return;
      }

      await sessionData.transport.handleRequest(req, res);
    });

    // Handle DELETE for session cleanup
    app.delete('/mcp', async (req: Request, res: Response) => {
      const sessionId = req.headers['mcp-session-id'] as string;
      const sessionData = this.sessions.get(sessionId);

      if (sessionData) {
        await sessionData.transport.close();
        await sessionData.server.close();
        this.sessions.delete(sessionId);
      }

      res.status(204).send();
    });

    this.httpServer = createServer(app);

    return new Promise<void>((resolve) => {
      this.httpServer!.listen(port, () => {
        console.error(`[MCP Server] HTTP transport listening on http://localhost:${port}`);
        console.error(`[MCP Server] MCP endpoint: POST/GET/DELETE http://localhost:${port}/mcp`);
        console.error(`[MCP Server] Health check: GET http://localhost:${port}/health`);
        resolve();
      });
    });
  }

  /**
   * Initialize stdio transport (for local CLI use)
   */
  private async initializeStdioTransport(): Promise<void> {
    if (!this.stdioApiClient) {
      throw new Error('API client not initialized for stdio mode');
    }

    this.stdioServer = this.createServerInstance(this.stdioApiClient);
    const transport = new StdioServerTransport();
    await this.stdioServer.connect(transport);

    process.stdin.on('end', async () => {
      await this.stop();
      process.exit(0);
    });

    process.stdin.on('error', async (error) => {
      console.error('stdin error:', error);
      await this.stop();
      process.exit(1);
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (this.options.useStdio) {
      await this.initializeStdioTransport();
      console.error('[MCP Server] Started with stdio transport');
    } else {
      await this.initializeHttpTransport(this.options.port ?? 3000);
      console.error('[MCP Server] Started with HTTP transport');
    }
  }

  /**
   * Stop the server and cleanup all resources
   */
  async stop(): Promise<void> {
    try {
      // Close all HTTP sessions
      for (const [sessionId, sessionData] of this.sessions) {
        await sessionData.transport.close();
        await sessionData.server.close();
        this.sessions.delete(sessionId);
      }

      // Close HTTP server if running
      if (this.httpServer) {
        await new Promise<void>((resolve) => {
          this.httpServer!.close(() => resolve());
        });
      }

      // Close stdio server if running
      if (this.stdioServer) {
        await this.stdioServer.close();
      }

      console.error('[MCP Server] Stopped');
    } catch (error) {
      console.error('[MCP Server] Error during shutdown:', error);
    }
  }

  /**
   * Get the API client (for testing - only available in stdio mode)
   */
  getApiClient(): TaskApiClient | undefined {
    return this.stdioApiClient;
  }
}
