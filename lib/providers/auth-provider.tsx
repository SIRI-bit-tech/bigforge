"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { useStore } from '@/lib/store'

interface AuthContextType {
  isLoading: boolean
  isInitialized: boolean
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isInitialized: false,
})

export function useAuth() {
  return useContext(AuthContext)
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const { restoreSession } = useStore()

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await restoreSession()
      } catch (error) {
        // Failed to restore session
      } finally {
        setIsLoading(false)
        setIsInitialized(true)
      }
    }

    initializeAuth()
  }, [restoreSession])

  return (
    <AuthContext.Provider value={{ isLoading, isInitialized }}>
      {children}
    </AuthContext.Provider>
  )
}