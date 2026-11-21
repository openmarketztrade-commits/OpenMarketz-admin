"use client"

import { useState } from "react"
import { UsersIcon } from "lucide-react"
import useSWR from "swr"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminPageHeader } from "./admin-page-header"
import { AdminError } from "./admin-error"
import { AdminTableSkeleton } from "./admin-loading"
import { AdminEmptyState } from "./admin-empty-state"
import { useAdminUsers } from "@/lib/admin-hooks"
import { getAdminUser, listAdminAuditEvents, listAdminUserSessions, revokeAdminUserSession, updateAdminUserRole, updateAdminUserStatus, deleteAdminUser, getErrorMessage } from "@/lib/api"
import { formatDateTime, humanize } from "@/lib/admin-format"

const PAGE_SIZE = 25

export function UsersView() {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [role, setRole] = useState("")
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data, error, isLoading, isValidating, mutate } = useAdminUsers({ q: query, status, role, page, pageSize: PAGE_SIZE })
  const details = useSWR(selectedId ? ["admin/user", selectedId] : null, ([, id]) => getAdminUser(id))
  const sessions = useSWR(selectedId ? ["admin/user-sessions", selectedId] : null, ([, id]) => listAdminUserSessions(id))
  const audit = useSWR(selectedId ? ["admin/user-audit", selectedId] : null, ([, id]) => listAdminAuditEvents(id))

  const refresh = async () => {
    await Promise.all([mutate(), details.mutate(), sessions.mutate(), audit.mutate()])
  }

  const changeStatus = async (id: string, next: "ACTIVE" | "SUSPENDED") => {
    try {
      await updateAdminUserStatus(id, next)
      toast.success(next === "SUSPENDED" ? "Account suspended and sessions revoked." : "Account reactivated.")
      await refresh()
    } catch (err) { toast.error(getErrorMessage(err, "Account status could not be changed.")) }
  }

  const changeRole = async (id: string, next: "ADMIN" | "SELLER" | "BUYER") => {
    try {
      await updateAdminUserRole(id, next)
      toast.success("Account role updated; active sessions were revoked.")
      await refresh()
    } catch (err) { toast.error(getErrorMessage(err, "Account role could not be changed.")) }
  }

  const removeUser = async (id: string, email: string) => {
    if (!window.confirm(`Delete ${email}? Their account will be disabled and sessions revoked. Order and audit history will be retained.`)) return
    try {
      await deleteAdminUser(id)
      toast.success("Account deleted and sessions revoked.")
      setSelectedId(null)
      await mutate()
    } catch (err) { toast.error(getErrorMessage(err, "Account could not be deleted.")) }
  }

  return (
    <>
      <AdminPageHeader title="Users" description="Review accounts, manage access and roles, revoke sessions, and inspect account audit history." meta={data && <Badge variant="secondary">{data.total} accounts</Badge>} />
      <div className="grid gap-3 md:grid-cols-3">
        <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search name, email, or store" aria-label="Search users" />
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} aria-label="Filter account status">
          <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DELETED">Deleted</option>
        </select>
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={role} onChange={(event) => { setRole(event.target.value); setPage(1) }} aria-label="Filter account role">
          <option value="">All roles</option><option value="BUYER">Buyer</option><option value="SELLER">Seller</option><option value="ADMIN">Admin</option>
        </select>
      </div>
      {isLoading ? <AdminTableSkeleton label="Loading users" /> : error ? <AdminError error={error} title="Unable to load users" onRetry={() => mutate()} retrying={isValidating} /> : data?.items.length ? (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">Account</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody>{data.items.map((user) => <tr key={user.id} className="border-b last:border-0">
              <td className="p-3"><button className="text-left hover:underline" onClick={() => setSelectedId(user.id)}><span className="block font-medium">{user.firstName} {user.lastName}</span><span className="text-xs text-muted-foreground">{user.email}{user.store ? ` · ${user.store.name}` : ""}</span></button></td>
              <td className="p-3"><Badge variant="outline">{humanize(user.role)}</Badge></td><td className="p-3"><Badge variant={user.status === "ACTIVE" ? "secondary" : "outline"}>{humanize(user.status)}</Badge></td><td className="p-3 whitespace-nowrap">{formatDateTime(user.createdAt)}</td>
              <td className="p-3"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setSelectedId(user.id)}>Details</Button>{user.status !== "DELETED" && <><Button size="sm" variant="outline" onClick={() => changeStatus(user.id, user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED")}>{user.status === "SUSPENDED" ? "Reactivate" : "Suspend"}</Button><Button size="sm" variant="destructive" onClick={() => removeUser(user.id, user.email)}>Delete</Button></>}</div></td>
            </tr>)}</tbody>
          </table>
          <div className="flex items-center justify-between border-t p-3"><span className="text-xs text-muted-foreground">Page {data.page} · {data.total} accounts</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Next</Button></div></div>
        </div>
      ) : <AdminEmptyState icon={UsersIcon} title="No accounts found" description="Try another search term or filter." />}

      {selectedId && <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Account details</CardTitle><Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>Close</Button></CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-2"><h3 className="font-medium">Profile and role</h3>{details.isLoading ? "Loading…" : details.error ? <AdminError error={details.error} onRetry={() => details.mutate()} /> : details.data && <><p>{details.data.firstName} {details.data.lastName}<br /><span className="text-sm text-muted-foreground">{details.data.email}</span></p><p className="text-sm">{details.data.store ? `Store: ${details.data.store.name}` : details.data.sellerApplication ? `Seller application: ${details.data.sellerApplication.status}` : "Buyer account"}</p><label className="flex items-center gap-2 text-sm">Role<select className="h-9 rounded-md border bg-background px-2" value={details.data.role} onChange={(event) => changeRole(selectedId, event.target.value as "ADMIN" | "SELLER" | "BUYER")}><option value="BUYER">Buyer</option><option value="SELLER">Seller</option><option value="ADMIN">Admin</option></select></label></>}</section>
          <section className="space-y-2"><h3 className="font-medium">Sessions</h3>{sessions.isLoading ? "Loading…" : sessions.error ? <AdminError error={sessions.error} onRetry={() => sessions.mutate()} /> : sessions.data?.length ? sessions.data.map((session) => <div key={session.id} className="flex items-center justify-between gap-2 rounded border p-2 text-xs"><span>{session.userAgent || "Unknown device"}<br /><span className="text-muted-foreground">{session.ipAddress || "IP unavailable"} · {session.revokedAt ? "Revoked" : "Active"}</span></span>{!session.revokedAt && <Button size="xs" variant="outline" onClick={async () => { try { await revokeAdminUserSession(selectedId, session.id); toast.success("Session revoked."); await refresh() } catch (err) { toast.error(getErrorMessage(err)) } }}>Revoke</Button>}</div>) : <p className="text-sm text-muted-foreground">No sessions recorded.</p>}</section>
          <section className="space-y-2"><h3 className="font-medium">Recent audit history</h3>{audit.isLoading ? "Loading…" : audit.error ? <AdminError error={audit.error} onRetry={() => audit.mutate()} /> : audit.data?.items.length ? audit.data.items.map((event) => <div key={event.id} className="rounded border p-2 text-xs"><span className="font-medium">{humanize(event.action)}</span><br /><span className="text-muted-foreground">{event.actor?.email || "System"} · {formatDateTime(event.createdAt)}</span></div>) : <p className="text-sm text-muted-foreground">No audit events recorded.</p>}</section>
        </CardContent>
      </Card>}
    </>
  )
}
