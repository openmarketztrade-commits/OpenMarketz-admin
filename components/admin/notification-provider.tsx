"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useAuth } from "@/components/auth-provider"
import { connectRealtime, getRealtimeUrl } from "@/lib/realtime"

export type NotificationKind = "support" | "order" | "seller" | "system"

export interface AdminNotification {
  id: string
  title: string
  message?: string
  kind: NotificationKind
  link?: string
  createdAt: string
  read: boolean
}

export type RealtimeStatus = "unconfigured" | "connecting" | "connected" | "disconnected"

interface NotificationContextValue {
  notifications: AdminNotification[]
  unreadCount: number
  status: RealtimeStatus
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  markRead: (id: string) => void
  markAllRead: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

interface IncomingNotification {
  id?: string
  title?: string
  message?: string
  body?: string
  type?: string
  kind?: string
  link?: string
  url?: string
  createdAt?: string
}

function normalizeKind(value?: string): NotificationKind {
  const lower = (value ?? "").toLowerCase()
  if (lower.includes("support") || lower.includes("ticket")) return "support"
  if (lower.includes("order") || lower.includes("delivery")) return "order"
  if (lower.includes("seller") || lower.includes("application")) return "seller"
  return "system"
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [status, setStatus] = useState<RealtimeStatus>("unconfigured")
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    if (!user || !getRealtimeUrl()) {
      setStatus("unconfigured")
      return
    }
    setStatus("connecting")
    const socket = connectRealtime()
    if (!socket) {
      setStatus("unconfigured")
      return
    }

    const handleConnect = () => setStatus("connected")
    const handleDisconnect = () => setStatus("disconnected")
    const handleNotification = (payload: IncomingNotification) => {
      const notification: AdminNotification = {
        id: payload.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: payload.title ?? "New notification",
        message: payload.message ?? payload.body,
        kind: normalizeKind(payload.kind ?? payload.type),
        link: payload.link ?? payload.url,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        read: false,
      }
      setNotifications((current) =>
        current.some((item) => item.id === notification.id) ? current : [notification, ...current].slice(0, 50),
      )
    }

    if (socket.connected) setStatus("connected")
    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("connect_error", handleDisconnect)
    socket.on("notification", handleNotification)

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("connect_error", handleDisconnect)
      socket.off("notification", handleNotification)
    }
  }, [user?.id])

  const markRead = useCallback((id: string) => {
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })))
  }, [])

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
      status,
      panelOpen,
      setPanelOpen,
      markRead,
      markAllRead,
    }),
    [markAllRead, markRead, notifications, panelOpen, status],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider")
  return context
}
