# @specmanager/mcp-server

A Model Context Protocol (MCP) server that integrates with [specmanager.ai](https://specmanager.ai) for AI-powered task management and project execution.

## Prerequisites

- Node.js >= 18
- A [specmanager.ai](https://specmanager.ai) account
- An API key from your specmanager.ai dashboard

## Installation

### Using npx (Recommended)

No installation required. Run directly with npx:

```bash
npx @specmanager/mcp-server
```

### Global Installation

```bash
npm install -g @specmanager/mcp-server
```

Then run:

```bash
specmanager-mcp
```

## Configuration

### Environment Variables

#### Stdio Mode

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SPECMANAGER_API_KEY` | Yes | - | Your API key from specmanager.ai |
| `SPECMANAGER_PROJECT_ID` | No | - | Default project ID (can be auto-detected from git) |

#### HTTP Mode

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | HTTP server port |

In HTTP mode, API keys are provided **per-request** via headers (see [HTTP Authentication](#http-authentication)).

### Getting Your API Key

1. Sign up or log in at [specmanager.ai](https://specmanager.ai)
2. Navigate to your account settings
3. Generate a new API key
4. Copy the key and set it as `SPECMANAGER_API_KEY`

## Usage

### Stdio Mode (Default)

For use with Claude Code or other MCP clients that communicate via stdio:

```bash
export SPECMANAGER_API_KEY="your-api-key"
npx @specmanager/mcp-server
``` 

### HTTP Mode

For hosted deployments or web-based integrations:

```bash
npx @specmanager/mcp-server --http
```

Or with a custom port:

```bash
npx @specmanager/mcp-server --http --port=8080
```

#### HTTP Authentication

In HTTP mode, no environment variable is needed for the API key. Instead, each request must include the API key via one of these headers:

```
Authorization: Bearer <your-api-key>
```

or

```
X-API-Key: <your-api-key>
```

This allows multi-tenant deployments where different users provide their own API keys.

#### HTTP Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/mcp` | MCP message handler |
| `GET` | `/mcp` | SSE stream for session |
| `DELETE` | `/mcp` | Session cleanup |

## Claude Code Integration

### Quick Setup (Recommended)

```bash
claude mcp add specmanager -e SPECMANAGER_API_KEY=your-api-key -- npx -y @specmanager/mcp-server
```

To add for your entire user (all projects):

```bash
claude mcp add specmanager --scope user -e SPECMANAGER_API_KEY=your-api-key -- npx -y @specmanager/mcp-server
```

### Manual Configuration

Alternatively, add to your MCP configuration file (`.mcp.json`):

```json
{
  "mcpServers": {
    "specmanager": {
      "command": "npx",
      "args": ["-y", "@specmanager/mcp-server"],
      "env": {
        "SPECMANAGER_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Available Tools

### list-projects

List your specmanager.ai projects. Supports auto-detection from git remote when `workingDir` is provided.

### list-specs

List specs for a project with task counts. Returns specs with pending/in-progress/done task counts. By default, only shows specs with pending or in-progress tasks. Use `includeCompleted=true` to also show fully completed specs.

### list-tasks

List available tasks for execution. Filter by status: `pending` (default), `in-progress`, `done`, or `all`. Optionally filter by `specId` to only show tasks from a specific spec.

### get-task

Retrieve detailed information about a specific task, including implementation steps, purpose, files to modify, and related spec context.

### start-task

Mark a task as in-progress before beginning work. Required for proper state tracking.

### complete-task

Mark a task as completed with a summary of what was implemented and which files were modified.

### report-progress

Send real-time progress updates on in-progress tasks. Updates appear in the specmanager.ai dashboard and VSCode extension.

## Project Auto-Detection

When working in a git repository linked to a specmanager.ai project, the server can automatically detect the project from your git remote URL. Simply provide the `workingDir` parameter to any tool that accepts it.

## Development

```bash
# Clone the repository
git clone https://github.com/specmanager/mcp-server.git
cd mcp-server

# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Run HTTP mode in development
npm run dev:http
```

## License

MIT

## Support

- Documentation: [specmanager.ai/docs](https://specmanager.ai/docs)
- Issues: [GitHub Issues](https://github.com/specmanager/mcp-server/issues)
