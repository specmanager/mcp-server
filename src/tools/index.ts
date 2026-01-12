/**
 * Tool registry - exports all tools for the MCP server
 */

import {
  listProjectsDefinition as _listProjectsDefinition,
  listProjectsSchema,
  handleListProjects,
} from './list-projects.js';
import type { ListProjectsInput } from './list-projects.js';

import {
  listTasksDefinition as _listTasksDefinition,
  listTasksSchema,
  handleListTasks,
} from './list-tasks.js';
import type { ListTasksInput } from './list-tasks.js';

import {
  getTaskDefinition as _getTaskDefinition,
  getTaskSchema,
  handleGetTask,
} from './get-task.js';
import type { GetTaskInput } from './get-task.js';

import {
  startTaskDefinition as _startTaskDefinition,
  startTaskSchema,
  handleStartTask,
} from './start-task.js';
import type { StartTaskInput } from './start-task.js';

import {
  completeTaskDefinition as _completeTaskDefinition,
  completeTaskSchema,
  handleCompleteTask,
} from './complete-task.js';
import type { CompleteTaskInput } from './complete-task.js';

import {
  reportProgressDefinition as _reportProgressDefinition,
  reportProgressSchema,
  handleReportProgress,
} from './report-progress.js';
import type { ReportProgressInput } from './report-progress.js';

import {
  listSpecsDefinition as _listSpecsDefinition,
  listSpecsSchema,
  handleListSpecs,
} from './list-specs.js';
import type { ListSpecsInput } from './list-specs.js';

// Re-export everything
export {
  _listProjectsDefinition as listProjectsDefinition,
  listProjectsSchema,
  handleListProjects,
  _listSpecsDefinition as listSpecsDefinition,
  listSpecsSchema,
  handleListSpecs,
  _listTasksDefinition as listTasksDefinition,
  listTasksSchema,
  handleListTasks,
  _getTaskDefinition as getTaskDefinition,
  getTaskSchema,
  handleGetTask,
  _startTaskDefinition as startTaskDefinition,
  startTaskSchema,
  handleStartTask,
  _completeTaskDefinition as completeTaskDefinition,
  completeTaskSchema,
  handleCompleteTask,
  _reportProgressDefinition as reportProgressDefinition,
  reportProgressSchema,
  handleReportProgress,
};

export type {
  ListProjectsInput,
  ListSpecsInput,
  ListTasksInput,
  GetTaskInput,
  StartTaskInput,
  CompleteTaskInput,
  ReportProgressInput,
};

/**
 * All tool definitions for MCP server registration
 */
export const toolDefinitions = [
  _listProjectsDefinition,
  _listSpecsDefinition,
  _listTasksDefinition,
  _getTaskDefinition,
  _startTaskDefinition,
  _completeTaskDefinition,
  _reportProgressDefinition,
];
