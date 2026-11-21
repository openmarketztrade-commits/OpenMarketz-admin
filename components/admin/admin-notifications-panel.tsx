"use client"

import { useRouter } from "next/navigation"
import {
  BellIcon,
  CheckCheckIcon,
  CheckIcon,
  ExternalLinkIcon,
  InfoIcon,
  LifeBuoyIcon,
  ShoppingCartIcon,
  StoreIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { formatDateTime } from "@/lib/admin-format"
import { cn } from "@/lib/utils"
import { useNotifications, type AdminNotification, type RealtimeStatus } from "./notification-provider"

const KIND_ICON = {
  support: LifeBuoyIcon,
  order: ShoppingCartIcon,
  seller: StoreIcon,
  system: InfoIcon,
}

const STATUS_COPY: Record<RealtimeStatus, string> = {
  unconfigured: "Admin notifications are not provided by the API yet.",
  connecting: "Connecting to the authenticated realtime gateway…",
  connected: "Realtime gateway connected. Admin notification events are not provided by the API yet.",
  disconnected: "Realtime gateway disconnected. Admin notification events are not provided by the API yet.",
}

export function AdminNotificationsButton({ className }: { className?: string }) {
  const { unreadCount, setPanelOpen } = useNotifications()
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative", className)}
      onClick={() => setPanelOpen(true)}
      aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
    >
      <BellIcon />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  )
}

export function AdminNotificationsPanel() {
  const { notifications, unreadCount, status, panelOpen, setPanelOpen, markRead, markAllRead } = useNotifications()
  const router = useRouter()

  const openNotification = (notification: AdminNotification) => {
    markRead(notification.id)
    if (notification.link) {
      setPanelOpen(false)
      router.push(notification.link)
    }
  }

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {unreadCount ? `${unreadCount} unread notifications` : ""}
      </div>
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <div className="flex items-center gap-2">
              <SheetTitle>Notifications</SheetTitle>
              {unreadCount > 0 && <Badge variant="secondary">{unreadCount} unread</Badge>}
            </div>
            <SheetDescription className="flex items-center gap-2">
              {status === "connecting" && <Spinner />}
              {STATUS_COPY[status]}
            </SheetDescription>
            {notifications.length > 0 && (
              <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={markAllRead} disabled={!unreadCount}>
                <CheckCheckIcon data-icon="inline-start" />
                Mark all as read
              </Button>
            )}
          </SheetHeader>

          {notifications.length === 0 ? (
            <Empty className="flex-1">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BellIcon />
                </EmptyMedia>
                <EmptyTitle>No notifications yet</EmptyTitle>
                <EmptyDescription>
                  The backend does not currently expose admin notification events.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <ul className="flex flex-col">
                {notifications.map((notification) => {
                  const Icon = KIND_ICON[notification.kind]
                  return (
                    <li
                      key={notification.id}
                      className={cn("flex gap-3 border-b px-4 py-3", !notification.read && "bg-muted/60")}
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="text-sm font-medium">
                          {!notification.read && <span className="sr-only">Unread: </span>}
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="line-clamp-2 text-sm text-muted-foreground">{notification.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {notification.link && (
                            <Button size="xs" variant="outline" onClick={() => openNotification(notification)}>
                              <ExternalLinkIcon data-icon="inline-start" />
                              Open
                            </Button>
                          )}
                          {!notification.read && (
                            <Button size="xs" variant="ghost" onClick={() => markRead(notification.id)}>
                              <CheckIcon data-icon="inline-start" />
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
