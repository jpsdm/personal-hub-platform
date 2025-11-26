// Workstation Module Utilities

/**
 * Format seconds to HH:MM:SS
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Format seconds to human readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  if (minutes > 0) {
    return `${minutes}min`;
  }

  return `${seconds}s`;
}

/**
 * Generate task code based on board prefix and sequence
 */
export function generateTaskCode(prefix: string, sequence: number): string {
  return `${prefix}-${sequence.toString().padStart(3, "0")}`;
}

/**
 * Extract prefix from board name
 */
export function getBoardPrefix(boardName: string): string {
  // Get first letters of each word, max 4 characters
  const words = boardName.trim().toUpperCase().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 4);
  }
  return words
    .map((w) => w[0])
    .join("")
    .substring(0, 4);
}

/**
 * Calculate total time spent on a task from pomodoro sessions
 */
export function calculateTaskTimeSpent(
  sessions: { duration: number; status: string }[]
): number {
  return sessions
    .filter((s) => s.status === "COMPLETED")
    .reduce((total, session) => total + session.duration, 0);
}

/**
 * Get color class for priority
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "URGENT":
      return "bg-red-500";
    case "HIGH":
      return "bg-orange-500";
    case "MEDIUM":
      return "bg-blue-500";
    case "LOW":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
}

/**
 * Get badge variant for priority
 */
export function getPriorityBadgeVariant(
  priority: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (priority) {
    case "URGENT":
      return "destructive";
    case "HIGH":
      return "default";
    case "MEDIUM":
      return "secondary";
    case "LOW":
      return "outline";
    default:
      return "outline";
  }
}
