/**
 * Task status enum
 */
export type TaskStatus = 'pending' | 'in-progress' | 'done';

/**
 * Basic task info (returned from list-tasks)
 */
export interface Task {
  id: string;
  taskNumber: string | null;
  title: string;
  status: TaskStatus;
  files: string[];
  implementation: string | null;
  purposes: string | null;
  sortOrder: number;
  specId: string;
  createdAt: string;
  updatedAt: string;
  spec?: {
    id: string;
    title: string;
    stage: string;
  };
}

/**
 * Full task details (returned from get-task)
 */
export interface TaskDetail extends Task {
  spec: {
    id: string;
    title: string;
    stage: string;
    requirementsContent: string | null;
    designContent: string | null;
  };
}

/**
 * Task completion data
 */
export interface TaskCompletion {
  summary: string;
  filesModified: string[];
  implementation?: string;
}

/**
 * Progress update data
 */
export interface ProgressUpdate {
  message: string;
  percent?: number;
}

/**
 * Task filters for listing
 */
export interface TaskFilters {
  status?: TaskStatus | 'all';
  specId?: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Error codes
 */
export enum ErrorCode {
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * MCP Server error
 */
export class MCPServerError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public httpStatus?: number
  ) {
    super(message);
    this.name = 'MCPServerError';
  }
}
