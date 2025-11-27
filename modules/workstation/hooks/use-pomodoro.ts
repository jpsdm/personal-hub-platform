"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PomodoroSession,
  PomodoroTimerState,
  PomodoroType,
  Task,
} from "../types";

interface UsePomodoroReturn extends PomodoroTimerState {
  startSession: (taskId?: string, type?: PomodoroType) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  stopSession: () => Promise<void>;
  resetTodaySessions: () => Promise<void>;
  linkTask: (task: Task | null) => void;
  sessions: PomodoroSession[];
  todaySessions: PomodoroSession[];
  fetchSessions: () => Promise<void>;
  isInitialized: boolean;
}

export function usePomodoro(userId: string | null): UsePomodoroReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(
    null
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [linkedTask, setLinkedTask] = useState<Task | null>(null);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch today's sessions
  const fetchSessions = useCallback(async () => {
    if (!userId) return;

    try {
      // Fetch all recent sessions (let client filter by date)
      const response = await fetch(
        `/api/workstation/pomodoro?userId=${userId}`
      );
      if (!response.ok) throw new Error("Failed to fetch sessions");
      const data = await response.json();
      setSessions(data);

      // Check for running session
      const runningSession = data.find(
        (s: PomodoroSession) => s.status === "RUNNING" || s.status === "PAUSED"
      );
      if (runningSession) {
        setCurrentSession(runningSession);
        setIsRunning(runningSession.status === "RUNNING");
        setIsPaused(runningSession.status === "PAUSED");

        // Calculate elapsed time
        const startTime = new Date(runningSession.startedAt).getTime();
        const now = Date.now();
        const elapsed =
          Math.floor((now - startTime) / 1000) - runningSession.pausedTime;
        setElapsedSeconds(Math.max(0, elapsed));

        // If session has a linked task, fetch it
        if (runningSession.taskId) {
          try {
            const taskResponse = await fetch(
              `/api/workstation/tasks/${runningSession.taskId}`
            );
            if (taskResponse.ok) {
              const taskData = await taskResponse.json();
              setLinkedTask(taskData);
            }
          } catch (err) {
            console.error("Error fetching linked task:", err);
          }
        }
      }

      setIsInitialized(true);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setIsInitialized(true);
    }
  }, [userId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Timer effect
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  const startSession = async (taskId?: string, type: PomodoroType = "WORK") => {
    if (!userId) return;

    const response = await fetch("/api/workstation/pomodoro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        taskId: taskId || linkedTask?.id,
        type,
      }),
    });

    if (!response.ok) throw new Error("Failed to start session");

    const session = await response.json();
    setCurrentSession(session);
    setIsRunning(true);
    setIsPaused(false);
    setElapsedSeconds(0);
    setSessions((prev) => [session, ...prev]);
  };

  const pauseSession = async () => {
    if (!currentSession) return;

    const response = await fetch(
      `/api/workstation/pomodoro/${currentSession.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      }
    );

    if (!response.ok) throw new Error("Failed to pause session");

    const session = await response.json();
    setCurrentSession(session);
    setIsPaused(true);
  };

  const resumeSession = async () => {
    if (!currentSession) return;

    const response = await fetch(
      `/api/workstation/pomodoro/${currentSession.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      }
    );

    if (!response.ok) throw new Error("Failed to resume session");

    const session = await response.json();
    setCurrentSession(session);
    setIsPaused(false);
  };

  const stopSession = async () => {
    if (!currentSession) return;

    const response = await fetch(
      `/api/workstation/pomodoro/${currentSession.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stop",
          duration: elapsedSeconds,
        }),
      }
    );

    if (!response.ok) throw new Error("Failed to stop session");

    const session = await response.json();
    setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
    setCurrentSession(null);
    setIsRunning(false);
    setIsPaused(false);
    setElapsedSeconds(0);
  };

  const linkTask = (task: Task | null) => {
    setLinkedTask(task);
  };

  const resetTodaySessions = async () => {
    if (!userId) return;

    const response = await fetch("/api/workstation/pomodoro/reset-today", {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to reset sessions");

    // Remove today's sessions from state
    const today = new Date().toDateString();
    setSessions((prev) =>
      prev.filter((s) => new Date(s.startedAt).toDateString() !== today)
    );
  };

  const todaySessions = sessions.filter((s) => {
    const sessionDate = new Date(s.startedAt).toDateString();
    const today = new Date().toDateString();
    return sessionDate === today && s.status === "COMPLETED";
  });

  return {
    isRunning,
    isPaused,
    currentSession,
    elapsedSeconds,
    linkedTask,
    sessions,
    todaySessions,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    resetTodaySessions,
    linkTask,
    fetchSessions,
    isInitialized,
  };
}
