/**
 * Git utility functions for detecting repository info from working directory
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Parse a git remote URL to extract owner/repo
 * Supports:
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo
 * - git@github.com:owner/repo.git
 * - git@github.com:owner/repo
 */
export function parseGitRemoteUrl(url: string): string | null {
  // HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = url.match(/https?:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return httpsMatch[1];
  }

  // SSH format: git@github.com:owner/repo.git
  const sshMatch = url.match(/git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return sshMatch[1];
  }

  return null;
}

/**
 * Read git config and extract the origin remote URL
 */
export async function getGitRemoteUrl(workingDir: string): Promise<string | null> {
  try {
    const gitConfigPath = join(workingDir, '.git', 'config');
    const configContent = await readFile(gitConfigPath, 'utf-8');

    // Parse git config to find [remote "origin"] section
    const lines = configContent.split('\n');
    let inOriginSection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for section headers
      if (trimmed.startsWith('[')) {
        inOriginSection = trimmed === '[remote "origin"]';
        continue;
      }

      // If we're in the origin section, look for url
      if (inOriginSection && trimmed.startsWith('url = ')) {
        return trimmed.slice(6).trim();
      }
    }

    return null;
  } catch {
    // File doesn't exist or can't be read
    return null;
  }
}

/**
 * Get the GitHub repository full name (owner/repo) from a working directory
 */
export async function getGitHubRepoFromWorkingDir(workingDir: string): Promise<string | null> {
  const remoteUrl = await getGitRemoteUrl(workingDir);
  if (!remoteUrl) {
    return null;
  }

  return parseGitRemoteUrl(remoteUrl);
}
