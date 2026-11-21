"use client"

import { useState, type FormEvent } from "react"
import useSWR from "swr"
import { ShieldCheckIcon, UserPlusIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth-provider"
import { AdminEmptyState } from "./admin-empty-state"
import { AdminError } from "./admin-error"
import { AdminPageHeader } from "./admin-page-header"
import { AdminTableSkeleton } from "./admin-loading"
import { grantAdminByEmail, getErrorMessage, listAdminUsers, revokeAdminAccess } from "@/lib/api"
import { formatDateTime, humanize } from "@/lib/admin-format"

export function AdminsView() {
  const { user: currentUser } = useAuth()
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { data, error, isLoading, isValidating, mutate } = useSWR("admin/administrators", () => listAdminUsers({ role: "ADMIN", page: 1, pageSize: 100 }))

  const addAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || submitting) return
    setSubmitting(true)
    try {
      await grantAdminByEmail(email)
      toast.success(`${email.trim()} now has administrator access.`)
      setEmail("")
      await mutate()
    } catch (err) { toast.error(getErrorMessage(err, "Administrator access could not be granted.")) }
    finally { setSubmitting(false) }
  }

  const removeAdmin = async (id: string, targetEmail: string) => {
    if (!window.confirm(`Remove administrator access from ${targetEmail}?`)) return
    try {
      await revokeAdminAccess(id)
      toast.success(`Administrator access removed from ${targetEmail}.`)
      await mutate()
    } catch (err) { toast.error(getErrorMessage(err, "Administrator access could not be removed.")) }
  }

  return <>
    <AdminPageHeader title="Administrators" description="Grant or remove administrator access for verified marketplace accounts." meta={data && <Badge variant="secondary">{data.total} administrators</Badge>} />
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><UserPlusIcon className="size-5" />Add an administrator</CardTitle><CardDescription>Enter the email address of an active, verified account. People must create and verify their account before you can grant access.</CardDescription></CardHeader>
      <CardContent><form onSubmit={addAdmin} className="flex flex-col gap-3 sm:flex-row"><Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" aria-label="Account email to grant admin access" className="sm:max-w-md" /><Button type="submit" disabled={submitting || !email.trim()}>{submitting ? "Adding…" : "Grant admin access"}</Button></form></CardContent>
    </Card>
    {isLoading ? <AdminTableSkeleton label="Loading administrators" /> : error ? <AdminError error={error} title="Unable to load administrators" onRetry={() => mutate()} retrying={isValidating} /> : data?.items.length ? <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">Administrator</th><th className="p-3">Account status</th><th className="p-3">Joined</th><th className="p-3 text-right">Action</th></tr></thead><tbody>{data.items.map((admin) => <tr key={admin.id} className="border-b last:border-0"><td className="p-3"><span className="block font-medium">{admin.firstName} {admin.lastName}{admin.id === currentUser?.id ? " (you)" : ""}</span><span className="text-xs text-muted-foreground">{admin.email}</span></td><td className="p-3"><Badge variant={admin.status === "ACTIVE" ? "secondary" : "outline"}>{humanize(admin.status)}</Badge></td><td className="p-3">{formatDateTime(admin.createdAt)}</td><td className="p-3 text-right">{admin.id === currentUser?.id ? <span className="text-xs text-muted-foreground">Current account</span> : <Button size="sm" variant="destructive" disabled={admin.status !== "ACTIVE" && data.total <= 1} onClick={() => removeAdmin(admin.id, admin.email)}>Remove admin access</Button>}</td></tr>)}</tbody></table>
    </div> : <AdminEmptyState icon={ShieldCheckIcon} title="No administrators found" description="The current administrator list is empty." />}
  </>
}
