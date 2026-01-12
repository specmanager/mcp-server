/**
 * get-task tool - Get detailed information about a specific task
 */

import { z } from 'zod';
import type { TaskApiClient } from '../api/client.js';

export const getTaskSchema = z.object({
  taskId: z.string().uuid('Task ID must be a valid UUID'),
});

export type GetTaskInput = z.infer<typeof getTaskSchema>;

export const getTaskDefinition = {
  name: 'get-task',
  description: `Get detailed information about a specific task.

Returns full task details including:
- Implementation steps and purpose
- Files to modify
- Related spec context (requirements and design excerpts)

Use this before starting work on a task to understand what needs to be done.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID (UUID) to get details for',
      },
    },
    required: ['taskId'],
  },
};

export async function handleGetTask(
  client: TaskApiClient,
  input: GetTaskInput
): Promise<string> {
  const task = await client.getTask(input.taskId);

  const sections: string[] = [];

  // Header
  const number = task.taskNumber ? `[${task.taskNumber}] ` : '';
  sections.push(`# ${number}${task.title}`);
  sections.push(`**Status:** ${task.status}`);
  sections.push(`**Task ID:** ${task.id}`);
  sections.push(`**Spec:** ${task.spec.title} (${task.spec.stage} stage)`);

  // Files
  if (task.files.length > 0) {
    sections.push(`\n## Files to Modify\n${task.files.map(f => `- ${f}`).join('\n')}`);
  }

  // Implementation details
  if (task.implementation) {
    sections.push(`\n## Implementation Details\n${task.implementation}`);
  }

  // Purpose
  if (task.purposes) {
    sections.push(`\n## Purpose\n${task.purposes}`);
  }

  // Spec context
  if (task.spec.requirementsContent || task.spec.designContent) {
    sections.push('\n## Spec Context');

    if (task.spec.requirementsContent) {
      // Show a truncated version of requirements
      const requirements = task.spec.requirementsContent.slice(0, 2000);
      const truncated = task.spec.requirementsContent.length > 2000 ? '\n...(truncated)' : '';
      sections.push(`\n### Requirements Excerpt\n${requirements}${truncated}`);
    }

    if (task.spec.designContent) {
      // Show a truncated version of design
      const design = task.spec.designContent.slice(0, 2000);
      const truncated = task.spec.designContent.length > 2000 ? '\n...(truncated)' : '';
      sections.push(`\n### Design Excerpt\n${design}${truncated}`);
    }
  }

  return sections.join('\n');
}
