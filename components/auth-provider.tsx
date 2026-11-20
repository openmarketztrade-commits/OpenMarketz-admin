"use client"

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react"
import useSWR from "swr"
import type { AuthUser } from "@/lib/admin-types"
import { ApiError, getCurrentUser, login, logout, setAccessToken } from "@/lib/api"
import { disconnectRealtime } from "@/lib/realtime"

interface AuthContextValue {
  user: AuthUser | null
  authReady: boolean
  authError: unknown
  signIn: (email: string, password: string) => Promise<AuthUser | null>
  signOut: () => Promise<void>
  refresh: () => Promise<unknown>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, error, isLoading, mutate } = useSWR("auth/me", getCurrentUser, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const signIn = useCallback(
    async (email: string, password: string) => {
      const authenticatedUser = await login(email, password)
      if (!authenticatedUser || authenticatedUser.role !== "ADMIN") {
        try {
          await logout()
        } finally {
          setAccessToken(null)
          await mutate(null, { revalidate: false })
        }
        throw new ApiError("This account does not have administrator access.", 403)
      }
      await mutate(authenticatedUser, { revalidate: false })
      return authenticatedUser
    },
    [mutate],
  )

  const signOut = useCallback(async () => {
    try {
      await logout()
    } finally {
      setAccessToken(null)
      disconnectRealtime()
      await mutate(null, { revalidate: false })
    }
  }, [mutate])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: data ?? null,
      authReady: !isLoading,
      authError: error,
      signIn,
      signOut,
      refresh: () => mutate(),
    }),
    [data, error, isLoading, mutate, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
