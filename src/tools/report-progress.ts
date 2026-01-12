/**
 * report-progress tool - Report progress on a task in-progress
 */

import { z } from 'zod';
import type { TaskApiClient } from '../api/client.js';

export const reportProgressSchema = z.object({
  taskId: z.string().uuid('Task ID must be a valid UUID'),
  message: z.string().min(1, 'Progress message is required'),
  percent: z.number().min(0).max(100).optional(),
});

export type ReportProgressInput = z.infer<typeof reportProgressSchema>;

export const reportProgressDefinition = {
  name: 'report-progress',
  description: `Report progress on a task that is in-progress.

Use this to keep users informed about what you're working on.
Progress updates appear in real-time in the VSCode extension and web dashboard.

The task must be in 'in-progress' status to report progress.
Good progress messages describe the current action, e.g.:
- "Creating API endpoint for user authentication"
- "Writing unit tests for the new component"
- "Refactoring database queries"`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID (UUID) being worked on',
      },
      message: {
        type: 'string',
        description: 'Progress message describing current work',
      },
      percent: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Optional percentage complete (0-100)',
      },
    },
    required: ['taskId', 'message'],
  },
};

export async function handleReportProgress(
  client: TaskApiClient,
  input: ReportProgressInput
): Promise<string> {
  await client.reportProgress(input.taskId, {
    message: input.message,
    percent: input.percent,
  });

  const percentStr = input.percent !== undefined ? ` (${input.percent}%)` : '';

  return `Progress reported${percentStr}: ${input.message}`;
}
