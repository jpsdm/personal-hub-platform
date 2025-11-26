// Current app version from package.json
export const APP_VERSION = "0.1.0";

// GitHub repository info
export const GITHUB_OWNER = "jpsdm";
export const GITHUB_REPO = "personal-hub-platform";

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
}

export interface VersionInfo {
  currentVersion: string;
  latestVersion: string | null;
  hasUpdate: boolean;
  releaseUrl: string | null;
  releaseNotes: string | null;
  releaseName: string | null;
  publishedAt: string | null;
}

/**
 * Compare two semver versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const normalize = (v: string) => v.replace(/^v/, "");
  const parts1 = normalize(v1).split(".").map(Number);
  const parts2 = normalize(v2).split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Fetch latest release from GitHub
 */
export async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      // No releases found or error
      if (response.status === 404) {
        return null;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch latest release:", error);
    return null;
  }
}

/**
 * Check if an update is available
 */
export async function checkForUpdates(): Promise<VersionInfo> {
  const release = await fetchLatestRelease();

  if (!release) {
    return {
      currentVersion: APP_VERSION,
      latestVersion: null,
      hasUpdate: false,
      releaseUrl: null,
      releaseNotes: null,
      releaseName: null,
      publishedAt: null,
    };
  }

  const latestVersion = release.tag_name.replace(/^v/, "");
  const hasUpdate = compareVersions(latestVersion, APP_VERSION) > 0;

  return {
    currentVersion: APP_VERSION,
    latestVersion,
    hasUpdate,
    releaseUrl: release.html_url,
    releaseNotes: release.body,
    releaseName: release.name,
    publishedAt: release.published_at,
  };
}
