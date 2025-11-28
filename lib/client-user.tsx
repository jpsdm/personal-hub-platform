"use client";

import type React from "react";

import Cookies from "js-cookie";
import { useEffect } from "react";

export function UserSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Sync user ID from sessionStorage to cookie for API requests
    const syncUserSession = () => {
      const userId = sessionStorage.getItem("currentUserId");
      if (userId) {
        Cookies.set("currentUserId", userId, { expires: 7 });
      } else {
        Cookies.remove("currentUserId");
      }
    };

    syncUserSession();

    // Listen for storage changes (from other tabs)
    window.addEventListener("storage", syncUserSession);
    // Listen for custom event (from same tab)
    window.addEventListener("userSessionChange", syncUserSession);

    return () => {
      window.removeEventListener("storage", syncUserSession);
      window.removeEventListener("userSessionChange", syncUserSession);
    };
  }, []);

  return <>{children}</>;
}
