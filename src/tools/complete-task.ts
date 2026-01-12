/**
 * complete-task tool - Mark a task as completed
 */

import { z } from 'zod';
import type { TaskApiClient } from '../api/client.js';

export const completeTaskSchema = z.object({
  taskId: z.string().uuid('Task ID must be a valid UUID'),
  summary: z.string().min(1, 'Summary is required'),
  filesModified: z.array(z.string()).min(1, 'At least one file must be listed'),
  implementation: z.string().optional(),
});

export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;

export const completeTaskDefinition = {
  name: 'complete-task',
  description: `Mark a task as completed with implementation summary.

Call this after successfully implementing a task.
Provide details about what was done and which files were modified.

The task must be in 'in-progress' status to complete it.
Use 'start-task' first if the task hasn't been started.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID (UUID) being completed',
      },
      summary: {
        type: 'string',
        description: 'Brief summary of what was implemented',
      },
      filesModified: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of file paths that were modified or created',
      },
      implementation: {
        type: 'string',
        description: 'Optional detailed implementation notes',
      },
    },
    required: ['taskId', 'summary', 'filesModified'],
  },
};

export async function handleCompleteTask(
  client: TaskApiClient,
  input: CompleteTaskInput
): Promise<string> {
  const task = await client.completeTask(input.taskId, {
    summary: input.summary,
    filesModified: input.filesModified,
    implementation: input.implementation,
  });

  const number = task.taskNumber ? `[${task.taskNumber}] ` : '';

  return `Task completed: ${number}${task.title}

Task ID: ${task.id}
Status: ${task.status}

Summary: ${input.summary}

Files Modified:
${input.filesModified.map(f => `- ${f}`).join('\n')}

The task has been marked as done and users have been notified.`;
}
