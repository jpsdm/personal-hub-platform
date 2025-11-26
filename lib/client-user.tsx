"use client"

import type React from "react"

import { useEffect } from "react"
import Cookies from "js-cookie"

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Sync user ID from sessionStorage to cookie for API requests
    const syncUserSession = () => {
      const userId = sessionStorage.getItem("currentUserId")
      if (userId) {
        Cookies.set("currentUserId", userId, { expires: 7 })
      } else {
        Cookies.remove("currentUserId")
      }
    }

    syncUserSession()

    // Listen for storage changes
    window.addEventListener("storage", syncUserSession)
    return () => window.removeEventListener("storage", syncUserSession)
  }, [])

  return <>{children}</>
}
