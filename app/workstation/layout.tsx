"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { PomodoroTimer } from "@/modules/workstation/components/pomodoro-timer";
import { usePomodoro } from "@/modules/workstation/hooks/use-pomodoro";
import type { Task } from "@/modules/workstation/types";
import { Briefcase, Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

const navigation = [{ name: "Quadros", href: "/workstation" }];

export default function WorkstationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Initialize pomodoro hook
  const pomodoro = usePomodoro(userId);

  // Listen for start pomodoro events from child components
  useEffect(() => {
    const handleStartPomodoro = async (event: Event) => {
      const customEvent = event as CustomEvent<{ taskId: string }>;
      const { taskId } = customEvent.detail;
      // Find the task to link
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        pomodoro.linkTask(task);
      }
      // Start the session
      try {
        await pomodoro.startSession(taskId);
      } catch (error) {
        console.error("Error starting pomodoro:", error);
      }
    };

    window.addEventListener("startPomodoro", handleStartPomodoro);
    return () => {
      window.removeEventListener("startPomodoro", handleStartPomodoro);
    };
  }, [tasks, pomodoro]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const storedUserId = sessionStorage.getItem("currentUserId");
    if (!storedUserId) {
      router.push("/profiles");
      return;
    }
    setUserId(storedUserId);
    setIsLoading(false);

    // Fetch all tasks for pomodoro linking
    const fetchTasks = async () => {
      try {
        const response = await fetch(
          `/api/workstation/tasks?userId=${storedUserId}`
        );
        if (response.ok) {
          const data = await response.json();
          setTasks(data);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };

    fetchTasks();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link
                href="/hub"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Home className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Voltar ao HUB
                </span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">
                  Workstation
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Navigation */}
      <nav className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors rounded-lg whitespace-nowrap"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>

      {/* Pomodoro Timer - Always visible */}
      <PomodoroTimer
        isRunning={pomodoro.isRunning}
        isPaused={pomodoro.isPaused}
        elapsedSeconds={pomodoro.elapsedSeconds}
        currentSession={pomodoro.currentSession}
        linkedTask={pomodoro.linkedTask}
        tasks={tasks}
        todaySessions={pomodoro.todaySessions}
        onStart={pomodoro.startSession}
        onPause={pomodoro.pauseSession}
        onResume={pomodoro.resumeSession}
        onStop={pomodoro.stopSession}
        onLinkTask={pomodoro.linkTask}
        onResetToday={pomodoro.resetTodaySessions}
      />
    </div>
  );
}
