/**
 * list-specs tool - Get specs for a project with task counts
 */

import { z } from 'zod';
import type { TaskApiClient } from '../api/client.js';
import { getGitHubRepoFromWorkingDir } from '../utils/git.js';

export const listSpecsSchema = z.object({
  projectId: z.string().uuid().optional(),
  workingDir: z.string().optional(),
  includeCompleted: z.boolean().optional().default(false),
});

export type ListSpecsInput = z.infer<typeof listSpecsSchema>;

export const listSpecsDefinition = {
  name: 'list-specs',
  description: `List specs for a project with task counts.

Returns specs with pending/in-progress/done task counts. You must specify either:
- projectId: The project UUID
- workingDir: Path to workspace (will auto-detect project from git remote)

By default, only shows specs with pending or in-progress tasks.
Use includeCompleted=true to also show fully completed specs.

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
      includeCompleted: {
        type: 'boolean',
        default: false,
        description: 'Include specs where all tasks are completed. Default: false',
      },
    },
  },
};

export async function handleListSpecs(
  client: TaskApiClient,
  input: ListSpecsInput
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
    const specs = await client.listSpecs();

    // Restore original project ID
    client.setProjectId(originalProjectId || '');

    // Filter out completed specs unless includeCompleted is true
    const filteredSpecs = input.includeCompleted
      ? specs
      : specs.filter(s => s.taskCounts.pending > 0 || s.taskCounts.inProgress > 0);

    if (filteredSpecs.length === 0) {
      const projectText = projectName ? ` for project "${projectName}"` : '';
      if (specs.length > 0 && !input.includeCompleted) {
        return `All specs${projectText} are completed! Use includeCompleted=true to see them.`;
      }
      return `No specs found${projectText}.`;
    }

    const lines: string[] = [];

    if (detectedFromRepo && projectName) {
      lines.push(`**Project:** ${projectName} (auto-detected from git)`);
      lines.push('');
    }

    lines.push(`Found ${filteredSpecs.length} spec(s):`);
    lines.push('');

    for (const spec of filteredSpecs) {
      const { taskCounts } = spec;
      const isComplete = taskCounts.pending === 0 && taskCounts.inProgress === 0;
      const statusIcon = isComplete ? '[DONE]' : '';

      lines.push(`- ${spec.title} ${statusIcon}`);
      lines.push(`   ID: ${spec.id}`);
      lines.push(`   Stage: ${spec.stage}`);
      lines.push(`   Tasks: ${taskCounts.pending} pending, ${taskCounts.inProgress} in-progress, ${taskCounts.done} done (${taskCounts.total} total)`);
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
