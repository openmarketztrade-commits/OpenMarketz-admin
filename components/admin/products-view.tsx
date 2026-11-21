"use client"

import { useState } from "react"
import { PackageIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminEmptyState } from "./admin-empty-state"
import { AdminError } from "./admin-error"
import { AdminPageHeader } from "./admin-page-header"
import { AdminTableSkeleton } from "./admin-loading"
import { useAdminProducts } from "@/lib/admin-hooks"
import { archiveAdminProduct, getErrorMessage, updateAdminProductStatus } from "@/lib/api"
import { formatAmount, formatDateTime, humanize } from "@/lib/admin-format"

const PAGE_SIZE = 25

export function ProductsView() {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const { data, error, isLoading, isValidating, mutate } = useAdminProducts({ q: query, status, page, pageSize: PAGE_SIZE })

  const setProductStatus = async (id: string, next: "ACTIVE" | "PAUSED") => {
    try { await updateAdminProductStatus(id, next); toast.success(`Product ${next === "PAUSED" ? "paused" : "activated"}.`); await mutate() }
    catch (err) { toast.error(getErrorMessage(err, "Product status could not be changed.")) }
  }

  const archiveProduct = async (id: string, name: string) => {
    if (!window.confirm(`Archive “${name}”? It will no longer appear in the public catalogue, and its order history will remain.`)) return
    try { await archiveAdminProduct(id); toast.success("Product archived."); await mutate() }
    catch (err) { toast.error(getErrorMessage(err, "Product could not be archived.")) }
  }

  return <>
    <AdminPageHeader title="Products" description="Moderate marketplace listings. Archiving removes a listing from the catalogue and preserves order history." meta={data && <Badge variant="secondary">{data.total} products</Badge>} />
    <div className="grid gap-3 md:grid-cols-2"><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search product, brand, or seller" aria-label="Search products" /><select className="h-9 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} aria-label="Filter product status"><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="ARCHIVED">Archived</option></select></div>
    {isLoading ? <AdminTableSkeleton label="Loading products" /> : error ? <AdminError error={error} title="Unable to load products" onRetry={() => mutate()} retrying={isValidating} /> : data?.items.length ? <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">Product</th><th className="p-3">Seller</th><th className="p-3">Status</th><th className="p-3">Price</th><th className="p-3">Created</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{data.items.map((product) => <tr key={product.id} className="border-b last:border-0"><td className="p-3"><span className="font-medium">{product.name}</span><span className="block text-xs text-muted-foreground">{product.brand || product.category?.name || product.slug}</span></td><td className="p-3">{product.seller?.storeName || product.seller?.name || "—"}<span className="block text-xs text-muted-foreground">{product.seller?.email}</span></td><td className="p-3"><Badge variant="outline">{humanize(product.status)}</Badge></td><td className="p-3 whitespace-nowrap">{formatAmount(product.price, "NGN")}</td><td className="p-3 whitespace-nowrap">{formatDateTime(product.createdAt)}</td><td className="p-3"><div className="flex justify-end gap-2">{product.status !== "ARCHIVED" && <><Button size="sm" variant="outline" onClick={() => setProductStatus(product.id, product.status === "PAUSED" ? "ACTIVE" : "PAUSED")}>{product.status === "PAUSED" ? "Activate" : "Pause"}</Button><Button size="sm" variant="destructive" onClick={() => archiveProduct(product.id, product.name)}>Archive</Button></>}</div></td></tr>)}</tbody></table>
      <div className="flex items-center justify-between border-t p-3"><span className="text-xs text-muted-foreground">Page {data.page} · {data.total} products</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Next</Button></div></div>
    </div> : <AdminEmptyState icon={PackageIcon} title="No products found" description="Try another search term or filter." />}
  </>
}
