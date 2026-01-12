/**
 * start-task tool - Mark a task as in-progress
 */

import { z } from 'zod';
import type { TaskApiClient } from '../api/client.js';

export const startTaskSchema = z.object({
  taskId: z.string().uuid('Task ID must be a valid UUID'),
});

export type StartTaskInput = z.infer<typeof startTaskSchema>;

export const startTaskDefinition = {
  name: 'start-task',
  description: `Mark a task as in-progress and begin execution.

IMPORTANT: Call this BEFORE starting to work on a task.
This ensures proper state tracking and notifies users via the UI.

The task must be in 'pending' status to start it.
Already completed tasks cannot be restarted.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID (UUID) to start working on',
      },
    },
    required: ['taskId'],
  },
};

export async function handleStartTask(
  client: TaskApiClient,
  input: StartTaskInput
): Promise<string> {
  const task = await client.startTask(input.taskId);

  const number = task.taskNumber ? `[${task.taskNumber}] ` : '';

  return `Task started: ${number}${task.title}

Task ID: ${task.id}
Status: ${task.status}

You can now begin implementing this task.
Use 'report-progress' to send status updates.
Use 'complete-task' when finished.`;
}
