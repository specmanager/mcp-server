/**
 * list-projects tool - List user's projects, optionally auto-detect from git
 */

import { z } from 'zod';
import type { TaskApiClient } from '../api/client.js';
import { getGitHubRepoFromWorkingDir } from '../utils/git.js';

export const listProjectsSchema = z.object({
  workingDir: z.string().optional(),
});

export type ListProjectsInput = z.infer<typeof listProjectsSchema>;

export const listProjectsDefinition = {
  name: 'list-projects',
  description: `List your specmanager.ai projects.

If workingDir is provided, will attempt to auto-detect the project by matching
the git remote to your linked GitHub repositories.

Use this to:
- See all your available projects
- Find the project ID for a specific repository
- Auto-detect which project matches your current workspace`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      workingDir: {
        type: 'string',
        description: 'Working directory path. If provided, will auto-detect project from git remote.',
      },
    },
  },
};

export interface ListProjectsResult {
  projects: Array<{
    id: string;
    name: string;
    githubRepo: string | null;
    isCurrentRepo: boolean;
  }>;
  detectedProject?: {
    id: string;
    name: string;
  };
  detectedRepo?: string;
}

export async function handleListProjects(
  client: TaskApiClient,
  input: ListProjectsInput
): Promise<string> {
  // Try to detect repo from working directory
  let detectedRepo: string | null = null;
  if (input.workingDir) {
    detectedRepo = await getGitHubRepoFromWorkingDir(input.workingDir);
  }

  // Get all projects
  const projects = await client.listProjects();

  if (projects.length === 0) {
    return 'No projects found. Create a project at specmanager.ai first.';
  }

  // Check if detected repo matches any project
  let detectedProject = null;
  if (detectedRepo) {
    detectedProject = projects.find(
      (p) => p.githubRepositoryFullName === detectedRepo
    );
  }

  // Format output
  const lines: string[] = [];

  if (detectedProject) {
    lines.push(`**Detected Project:** ${detectedProject.name}`);
    lines.push(`  ID: ${detectedProject.id}`);
    lines.push(`  Repository: ${detectedRepo}`);
    lines.push('');
    lines.push('This project matches your current workspace.');
    lines.push('');
  } else if (detectedRepo) {
    lines.push(`**Detected Repository:** ${detectedRepo}`);
    lines.push('No project is linked to this repository.');
    lines.push('');
  }

  lines.push(`**Your Projects (${projects.length}):**`);
  lines.push('');

  for (const project of projects) {
    const isCurrent = project.id === detectedProject?.id;
    const marker = isCurrent ? ' (current)' : '';
    const repo = project.githubRepositoryFullName || 'No repo linked';

    lines.push(`- **${project.name}**${marker}`);
    lines.push(`  ID: ${project.id}`);
    lines.push(`  Repository: ${repo}`);
    lines.push('');
  }

  return lines.join('\n');
}
