"use client"

import { createContext, useContext } from "react"

export interface User {
  id: string
  name: string
  email: string
  avatarColor: string
  hasPassword: boolean
}

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
})

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within UserProvider")
  }
  return context
}
