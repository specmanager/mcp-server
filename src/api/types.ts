/**
 * API request/response types for the specmanager backend
 */

import type { Task, TaskDetail, TaskStatus } from '../types.js';

// Project info
export interface Project {
  id: string;
  name: string;
  githubRepositoryFullName: string | null;
  githubRepositoryUrl: string | null;
  githubRepositoryDefaultBranch?: string | null;
  createdAt: string;
  updatedAt: string;
}

// List projects response
export interface ListProjectsResponse {
  projects: Project[];
}

// Spec info with task counts
export interface Spec {
  id: string;
  title: string;
  stage: 'requirements' | 'design' | 'tasks';
  taskCounts: {
    pending: number;
    inProgress: number;
    done: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
}

// List specs response
export interface ListSpecsResponse {
  specs: Spec[];
}

// Get project by repo response
export interface GetProjectByRepoResponse {
  project: Project;
}

// User info from /me endpoint
export interface MeResponse {
  user: {
    id: string;
    email: string;
    name: string;
    githubUsername?: string | null;
    githubAvatarUrl?: string | null;
    createdAt: string;
  };
}

// List tasks response
export interface ListTasksResponse {
  tasks: Task[];
}

// Get task response
export interface GetTaskResponse {
  task: TaskDetail;
}

// Start task response
export interface StartTaskResponse {
  task: Task;
}

// Complete task request
export interface CompleteTaskRequest {
  summary: string;
  filesModified: string[];
  implementation?: string;
}

// Complete task response
export interface CompleteTaskResponse {
  task: Task;
}

// Report progress request
export interface ReportProgressRequest {
  message: string;
  percent?: number;
}

// Report progress response
export interface ReportProgressResponse {
  success: boolean;
}

// Error response
export interface ErrorResponse {
  error: string;
  code?: string;
  message?: string;
}
