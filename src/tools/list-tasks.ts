/**
 * list-tasks tool - Get available tasks for execution
 */

import { z } from 'zod';
import type { TaskApiClient } from '../api/client.js';
import { getGitHubRepoFromWorkingDir } from '../utils/git.js';

export const listTasksSchema = z.object({
  projectId: z.string().uuid().optional(),
  workingDir: z.string().optional(),
  status: z.enum(['pending', 'in-progress', 'done', 'all']).optional().default('pending'),
  specId: z.string().uuid().optional(),
});

export type ListTasksInput = z.infer<typeof listTasksSchema>;

export const listTasksDefinition = {
  name: 'list-tasks',
  description: `List available tasks for execution.

Returns tasks filtered by status and optionally by spec. You must specify either:
- projectId: The project UUID
- workingDir: Path to workspace (will auto-detect project from git remote)

By default, returns only pending tasks. Use status="in-progress" to see
tasks currently being worked on, or status="all" to see everything.

Optionally filter by specId to only show tasks from a specific spec.

If workingDir is provided, the tool will read .git/config to find the
GitHub repository and match it to your linked projects.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      projectId: {
        type: 'string',
        description: 'Project ID (UUID). If not provided, will try to auto-detect from workingDir.',
      },
      workingDir: {
        type: 'string',
        description: 'Working directory path. Used to auto-detect project from git remote.',
      },
      status: {
        type: 'string',
        enum: ['pending', 'in-progress', 'done', 'all'],
        default: 'pending',
        description: 'Filter tasks by status. Default: pending',
      },
      specId: {
        type: 'string',
        description: 'Filter tasks by spec ID (UUID). Only return tasks from this spec.',
      },
    },
  },
};

export async function handleListTasks(
  client: TaskApiClient,
  input: ListTasksInput
): Promise<string> {
  let projectId = input.projectId;
  let projectName: string | undefined;
  let detectedFromRepo = false;

  // If no projectId, try to detect from workingDir
  if (!projectId && input.workingDir) {
    const repoFullName = await getGitHubRepoFromWorkingDir(input.workingDir);
    if (repoFullName) {
      const project = await client.getProjectByRepo(repoFullName);
      if (project) {
        projectId = project.id;
        projectName = project.name;
        detectedFromRepo = true;
      } else {
        return `No project found linked to repository: ${repoFullName}

Use 'list-projects' to see your available projects, or link this repository
to a project at specmanager.ai.`;
      }
    } else {
      return `Could not detect git repository from: ${input.workingDir}

Make sure the directory contains a .git folder with a remote origin configured.
Alternatively, provide a projectId directly.`;
    }
  }

  // If still no projectId, check if one was set on the client
  if (!projectId) {
    projectId = client.getProjectId();
  }

  if (!projectId) {
    return `No project specified. Please provide either:
- projectId: The project UUID
- workingDir: Path to a git repository linked to your project

Use 'list-projects' to see your available projects.`;
  }

  // Temporarily set project ID on client for this request
  const originalProjectId = client.getProjectId();
  client.setProjectId(projectId);

  try {
    const tasks = await client.listTasks({ status: input.status, specId: input.specId });

    // Restore original project ID
    client.setProjectId(originalProjectId || '');

    if (tasks.length === 0) {
      const statusText = input.status === 'all' ? '' : `${input.status} `;
      const projectText = projectName ? ` for project "${projectName}"` : '';
      return `No ${statusText}tasks found${projectText}.`;
    }

    const lines: string[] = [];

    if (detectedFromRepo && projectName) {
      lines.push(`**Project:** ${projectName} (auto-detected from git)`);
      lines.push('');
    }

    lines.push(`Found ${tasks.length} task(s):`);
    lines.push('');

    for (const task of tasks) {
      const number = task.taskNumber ? `[${task.taskNumber}] ` : '';
      const specTitle = task.spec?.title ? ` (${task.spec.title})` : '';
      const files = task.files.length > 0 ? `\n   Files: ${task.files.join(', ')}` : '';

      lines.push(`- ${number}${task.title}${specTitle}`);
      lines.push(`   ID: ${task.id}`);
      lines.push(`   Status: ${task.status}${files}`);
      lines.push('');
    }

    return lines.join('\n');
  } finally {
    // Ensure we restore original project ID even on error
    if (originalProjectId) {
      client.setProjectId(originalProjectId);
    }
  }
}
