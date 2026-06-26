import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AppUser } from '../lib/types'

interface UserContextValue {
  activeUser: AppUser | null
  setActiveUser: (user: AppUser) => void
  clearUser: () => void
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [activeUser, setActiveUserState] = useState<AppUser | null>(null)

  const setActiveUser = (user: AppUser) => setActiveUserState(user)
  const clearUser = () => setActiveUserState(null)

  return (
    <UserContext.Provider value={{ activeUser, setActiveUser, clearUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
