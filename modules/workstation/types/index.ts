// Workstation Module Types
// This module is designed to be decoupled from the core application

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type PomodoroType = "WORK" | "SHORT_BREAK" | "LONG_BREAK";
export type PomodoroStatus = "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";

export interface KanbanBoard {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  columns?: KanbanColumn[];
  tasks?: Task[];
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  name: string;
  color: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  tasks?: Task[];
}

export interface Task {
  id: string;
  userId: string;
  boardId: string;
  columnId: string;
  code: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  dueDate?: Date | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  column?: KanbanColumn;
  board?: KanbanBoard;
  pomodoroSessions?: PomodoroSession[];
  timeEntries?: TimeEntry[];
  totalTimeSpent?: number; // Calculated field in seconds
}

export interface PomodoroSession {
  id: string;
  userId: string;
  taskId?: string | null;
  startedAt: Date;
  endedAt?: Date | null;
  duration: number;
  type: PomodoroType;
  status: PomodoroStatus;
  pausedAt?: Date | null;
  pausedTime: number;
  createdAt: Date;
  updatedAt: Date;
  task?: Task | null;
}

export interface TimeEntry {
  id: string;
  userId: string;
  taskId?: string | null;
  description?: string | null;
  startedAt: Date;
  endedAt: Date;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
  task?: Task | null;
}

// Form types for creating/updating
export interface CreateBoardInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateBoardInput {
  name?: string;
  description?: string;
  color?: string;
}

export interface CreateColumnInput {
  boardId: string;
  name: string;
  color?: string;
  order?: number;
}

export interface UpdateColumnInput {
  name?: string;
  color?: string;
  order?: number;
}

export interface CreateTaskInput {
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date;
}

export interface UpdateTaskInput {
  columnId?: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date | null;
  order?: number;
}

export interface MoveTaskInput {
  taskId: string;
  targetColumnId: string;
  targetOrder: number;
}

export interface StartPomodoroInput {
  taskId?: string;
  type?: PomodoroType;
}

export interface PomodoroTimerState {
  isRunning: boolean;
  isPaused: boolean;
  currentSession: PomodoroSession | null;
  elapsedSeconds: number;
  linkedTask: Task | null;
}

// Default column templates
export const DEFAULT_COLUMNS = [
  { name: "Backlog", color: "#6B7280", order: 0 },
  { name: "Em Progresso", color: "#3B82F6", order: 1 },
  { name: "Em Teste", color: "#F59E0B", order: 2 },
  { name: "Finalizado", color: "#10B981", order: 3 },
];

// Priority colors
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "#6B7280",
  MEDIUM: "#3B82F6",
  HIGH: "#F59E0B",
  URGENT: "#EF4444",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

// Pomodoro settings
export const POMODORO_DURATIONS = {
  WORK: 25 * 60, // 25 minutes
  SHORT_BREAK: 5 * 60, // 5 minutes
  LONG_BREAK: 15 * 60, // 15 minutes
};
