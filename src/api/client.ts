/**
 * API client for specmanager.ai backend
 *
 * Uses the public API v1 with API key authentication.
 * User context is derived from the API key on the server side.
 */

import type { Config } from '../config.js';
import type { Task, TaskDetail, TaskCompletion, ProgressUpdate, TaskFilters } from '../types.js';
import { MCPServerError, ErrorCode } from '../types.js';
import type {
  ListTasksResponse,
  GetTaskResponse,
  StartTaskResponse,
  CompleteTaskResponse,
  ReportProgressResponse,
  ListProjectsResponse,
  ListSpecsResponse,
  GetProjectByRepoResponse,
  MeResponse,
  Project,
  Spec,
} from './types.js';

export class TaskApiClient {
  private apiUrl: string;
  private apiKey: string;
  private projectId?: string;

  constructor(config: Config) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
  }

  /**
   * Set the project ID for subsequent requests
   */
  setProjectId(projectId: string): void {
    this.projectId = projectId;
  }

  /**
   * Get the current project ID
   */
  getProjectId(): string | undefined {
    return this.projectId;
  }

  /**
   * Make an authenticated request to the public API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    // Use public API v1 endpoint
    const url = `${this.apiUrl}/api/v1${path}`;

    // Build headers with API key authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
        const message = (errorData.message || errorData.error || `HTTP ${response.status}`) as string;
        const code = (errorData.code || 'API_ERROR') as string;

        throw new MCPServerError(
          message,
          this.mapErrorCode(code, response.status),
          response.status
        );
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof MCPServerError) {
        throw error;
      }

      throw new MCPServerError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Map API error codes to our error codes
   */
  private mapErrorCode(apiCode: string, status: number): ErrorCode {
    if (status === 401 || status === 403) {
      return ErrorCode.UNAUTHORIZED;
    }
    if (apiCode === 'TASK_NOT_FOUND') {
      return ErrorCode.TASK_NOT_FOUND;
    }
    if (apiCode === 'PROJECT_NOT_FOUND') {
      return ErrorCode.PROJECT_NOT_FOUND;
    }
    if (apiCode === 'INVALID_STATE_TRANSITION' ||
        apiCode === 'TASK_ALREADY_IN_PROGRESS' ||
        apiCode === 'TASK_NOT_STARTED' ||
        apiCode === 'TASK_ALREADY_COMPLETED') {
      return ErrorCode.INVALID_STATE_TRANSITION;
    }
    return ErrorCode.API_ERROR;
  }

  /**
   * Get current user info (validates API key)
   */
  async getMe(): Promise<{ id: string; email: string; name: string }> {
    const response = await this.request<MeResponse>('GET', '/me');
    return response.user;
  }

  /**
   * List tasks for the configured project
   */
  async listTasks(filters?: TaskFilters): Promise<Task[]> {
    if (!this.projectId) {
      throw new MCPServerError(
        'Project ID is required. Set SPECMANAGER_PROJECT_ID or call setProjectId()',
        ErrorCode.NOT_CONFIGURED
      );
    }

    const status = filters?.status || 'all';
    const params = new URLSearchParams({ status });
    if (filters?.specId) {
      params.append('specId', filters.specId);
    }

    const response = await this.request<ListTasksResponse>(
      'GET',
      `/projects/${this.projectId}/tasks?${params.toString()}`
    );

    return response.tasks;
  }

  /**
   * Get a single task with full details
   */
  async getTask(taskId: string): Promise<TaskDetail> {
    const response = await this.request<GetTaskResponse>(
      'GET',
      `/tasks/${taskId}`
    );

    return response.task;
  }

  /**
   * Start a task (mark as in-progress)
   */
  async startTask(taskId: string): Promise<Task> {
    const response = await this.request<StartTaskResponse>(
      'PATCH',
      `/tasks/${taskId}/start`
    );

    return response.task;
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: string, completion: TaskCompletion): Promise<Task> {
    const response = await this.request<CompleteTaskResponse>(
      'PATCH',
      `/tasks/${taskId}/complete`,
      completion
    );

    return response.task;
  }

  /**
   * Report progress on a task
   */
  async reportProgress(taskId: string, progress: ProgressUpdate): Promise<void> {
    await this.request<ReportProgressResponse>(
      'POST',
      `/tasks/${taskId}/progress`,
      progress
    );
  }

  /**
   * List all projects for the current user
   */
  async listProjects(): Promise<Project[]> {
    const response = await this.request<ListProjectsResponse>(
      'GET',
      '/projects'
    );

    return response.projects;
  }

  /**
   * List specs for a project with task counts
   */
  async listSpecs(): Promise<Spec[]> {
    if (!this.projectId) {
      throw new MCPServerError(
        'Project ID is required. Set SPECMANAGER_PROJECT_ID or call setProjectId()',
        ErrorCode.NOT_CONFIGURED
      );
    }

    const response = await this.request<ListSpecsResponse>(
      'GET',
      `/projects/${this.projectId}/specs`
    );

    return response.specs;
  }

  /**
   * Find a project by its linked GitHub repository
   */
  async getProjectByRepo(repoFullName: string): Promise<Project | null> {
    try {
      const response = await this.request<GetProjectByRepoResponse>(
        'GET',
        `/projects/by-repo?repo=${encodeURIComponent(repoFullName)}`
      );

      return response.project;
    } catch (error) {
      // Return null if project not found (404)
      if (error instanceof MCPServerError && error.code === ErrorCode.PROJECT_NOT_FOUND) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Test the connection to the API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Use a simple endpoint to test connectivity
      // The health endpoint doesn't require auth, so we'll try listing tasks
      // If no project ID, just verify the API URL is reachable
      const response = await fetch(`${this.apiUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
