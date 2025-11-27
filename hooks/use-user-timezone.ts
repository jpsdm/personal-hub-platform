"use client";

import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import { useCallback, useEffect, useState } from "react";

interface UserTimezoneHook {
  timezone: string;
  isLoading: boolean;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (date: Date | string) => string;
  formatDateShort: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
  getToday: () => string;
}

export function useUserTimezone(): UserTimezoneHook {
  const [timezone, setTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTimezone = () => {
      const userStr = sessionStorage.getItem("currentUser");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.timezone) {
            setTimezone(user.timezone);
          }
        } catch {
          // Keep default
        }
      }
      setIsLoading(false);
    };

    loadTimezone();

    // Listen for storage changes (when user updates profile)
    const handleStorage = () => {
      loadTimezone();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      const d = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: timezone,
        ...options,
      }).format(d);
    },
    [timezone]
  );

  const formatDateTime = useCallback(
    (date: Date | string): string => {
      return formatDate(date, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    [formatDate]
  );

  const formatDateShort = useCallback(
    (date: Date | string): string => {
      return formatDate(date, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },
    [formatDate]
  );

  const formatTime = useCallback(
    (date: Date | string): string => {
      return formatDate(date, {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    [formatDate]
  );

  const getToday = useCallback((): string => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(now); // Returns YYYY-MM-DD
  }, [timezone]);

  return {
    timezone,
    isLoading,
    formatDate,
    formatDateTime,
    formatDateShort,
    formatTime,
    getToday,
  };
}
