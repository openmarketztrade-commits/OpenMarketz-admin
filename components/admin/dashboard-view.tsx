"use client"

import Link from "next/link"
import { useMemo, type ReactNode } from "react"
import {
  ArrowRightIcon,
  LifeBuoyIcon,
  PackageIcon,
  ShoppingCartIcon,
  StoreIcon,
  UsersIcon,
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminProducts, useAdminSupportTickets, useAdminUsers, useSellerApplications } from "@/lib/admin-hooks"
import {
  display,
  formatDate,
  isAwaitingReview,
  personName,
  storeHandle,
  submittedAt,
  ticketCustomerName,
  ticketNumber,
  ticketTopic,
  timestamp,
} from "@/lib/admin-format"
import { getErrorMessage } from "@/lib/api"
import { AdminError } from "./admin-error"
import { AdminListSkeleton } from "./admin-loading"
import { AdminPageHeader } from "./admin-page-header"
import { AdminStatCard } from "./admin-stat-card"
import { AdminStatusBadge } from "./admin-status-badge"

const OPEN_TICKET_STATUSES = new Set(["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"])

function ActivityCard({
  title,
  description,
  href,
  children,
}: {
  title: string
  description: string
  href: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href={href} />} nativeButton={false}>
            View all
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function ActivityRow({ href, title, subtitle, status }: { href: string; title: string; subtitle: string; status: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-lg px-2 py-2 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{title}</span>
          <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
        </div>
        <AdminStatusBadge status={status} />
      </Link>
    </li>
  )
}

export function DashboardView() {
  const { user } = useAuth()
  const sellers = useSellerApplications()
  const tickets = useAdminSupportTickets()
  const users = useAdminUsers({ pageSize: 1 })
  const products = useAdminProducts({ pageSize: 1 })

  const pendingSellers = useMemo(
    () =>
      (sellers.data ?? [])
        .filter((app) => isAwaitingReview(app.status))
        .sort((a, b) => timestamp(submittedAt(b)) - timestamp(submittedAt(a))),
    [sellers.data],
  )
  const openTickets = useMemo(
    () =>
      (tickets.data ?? [])
        .filter((t) => OPEN_TICKET_STATUSES.has(t.status))
        .sort((a, b) => timestamp(b.updatedAt ?? b.createdAt) - timestamp(a.updatedAt ?? a.createdAt)),
    [tickets.data],
  )

  const firstName = user?.firstName || personName(user)?.split(" ")[0]

  return (
    <>
      <AdminPageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description="A live view of seller applications and support tickets from the OpenMarketz API."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard
          label="Pending seller applications"
          icon={StoreIcon}
          value={sellers.data ? pendingSellers.length : null}
          loading={sellers.isLoading}
          errorMessage={sellers.error ? getErrorMessage(sellers.error) : undefined}
          hint={sellers.data ? `${sellers.data.length} applications in total` : undefined}
          href="/admin/sellers?status=awaiting"
        />
        <AdminStatCard
          label="Open support tickets"
          icon={LifeBuoyIcon}
          value={tickets.data ? openTickets.length : null}
          loading={tickets.isLoading}
          errorMessage={tickets.error ? getErrorMessage(tickets.error) : undefined}
          hint={tickets.data ? `${tickets.data.length} tickets in total` : undefined}
          href="/admin/support"
        />
        <AdminStatCard label="Orders" icon={ShoppingCartIcon} unavailableMessage="The API does not expose an admin order list yet." />
        <AdminStatCard label="Users" icon={UsersIcon} value={users.data?.total ?? null} loading={users.isLoading} errorMessage={users.error ? getErrorMessage(users.error) : undefined} href="/admin/users" />
        <AdminStatCard label="Products" icon={PackageIcon} value={products.data?.total ?? null} loading={products.isLoading} errorMessage={products.error ? getErrorMessage(products.error) : undefined} href="/admin/products" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ActivityCard title="Seller applications" description="Newest applications awaiting review" href="/admin/sellers">
          {sellers.isLoading ? (
            <AdminListSkeleton rows={4} />
          ) : sellers.error ? (
            <AdminError error={sellers.error} onRetry={() => sellers.mutate()} retrying={sellers.isValidating} />
          ) : pendingSellers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No applications are waiting for review.</p>
          ) : (
            <ul className="flex flex-col">
              {pendingSellers.slice(0, 5).map((app) => (
                <ActivityRow
                  key={app.id}
                  href="/admin/sellers?status=awaiting"
                  title={display(app.brandName)}
                  subtitle={`${storeHandle(app) ? `@${storeHandle(app)} · ` : ""}${formatDate(submittedAt(app))}`}
                  status={app.status}
                />
              ))}
            </ul>
          )}
        </ActivityCard>

        <ActivityCard title="Support activity" description="Most recently updated open tickets" href="/admin/support">
          {tickets.isLoading ? (
            <AdminListSkeleton rows={4} />
          ) : tickets.error ? (
            <AdminError error={tickets.error} onRetry={() => tickets.mutate()} retrying={tickets.isValidating} />
          ) : openTickets.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No open tickets. Nice work.</p>
          ) : (
            <ul className="flex flex-col">
              {openTickets.slice(0, 5).map((ticket) => (
                <ActivityRow
                  key={ticket.id}
                  href={`/admin/support?ticket=${encodeURIComponent(ticket.id)}`}
                  title={`${ticketCustomerName(ticket)} · ${ticketTopic(ticket)}`}
                  subtitle={`${ticketNumber(ticket)} · ${formatDate(ticket.updatedAt ?? ticket.createdAt)}`}
                  status={ticket.status}
                />
              ))}
            </ul>
          )}
        </ActivityCard>

      </div>
    </>
  )
}
