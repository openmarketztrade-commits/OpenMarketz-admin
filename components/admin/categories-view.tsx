"use client"

import { useState, type FormEvent } from "react"
import { CheckIcon, Loader2Icon, PencilIcon, TagsIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { AdminError } from "@/components/admin/admin-error"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminTableSkeleton } from "@/components/admin/admin-loading"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAdminCategories } from "@/lib/admin-hooks"
import { createAdminCategory, getErrorMessage, updateAdminCategory, updateAdminCategoryStatus } from "@/lib/api"

function slugFromName(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export function CategoriesView() {
  const { data: categories, error, isLoading, isValidating, mutate } = useAdminCategories()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [sortOrder, setSortOrder] = useState("0")
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editImageUrl, setEditImageUrl] = useState("")

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (creating) return
    setCreating(true)
    try {
      await createAdminCategory({
        name: name.trim(),
        ...(slug.trim() ? { slug: slug.trim() } : {}),
        description: description.trim(),
        ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
        sortOrder: Number(sortOrder),
        active: true,
      })
      toast.success(`${name.trim()} created and activated.`)
      setName("")
      setSlug("")
      setSlugEdited(false)
      setDescription("")
      setImageUrl("")
      setSortOrder("0")
      await mutate()
    } catch (cause) {
      toast.error(getErrorMessage(cause, "The category could not be created."))
    } finally {
      setCreating(false)
    }
  }

  async function toggleCategory(category: NonNullable<typeof categories>[number]) {
    if (updatingId) return
    const active = !category.active
    if (category.active && !window.confirm(`Deactivate “${category.name}”? Sellers will no longer be able to select it for new products.`)) return
    setUpdatingId(category.id)
    try {
      await updateAdminCategoryStatus(category.id, active)
      toast.success(`${category.name} ${active ? "activated" : "deactivated"}.`)
      await mutate()
    } catch (cause) {
      toast.error(getErrorMessage(cause, "The category status could not be changed."))
    } finally {
      setUpdatingId(null)
    }
  }

  function startEditing(category: NonNullable<typeof categories>[number]) {
    setEditingId(category.id)
    setEditImageUrl(category.imageUrl ?? "")
  }

  async function saveCategoryImage(category: NonNullable<typeof categories>[number]) {
    if (updatingId) return
    setUpdatingId(category.id)
    try {
      await updateAdminCategory(category.id, { imageUrl: editImageUrl.trim() || null })
      toast.success(`${category.name} image URL updated.`)
      setEditingId(null)
      await mutate()
    } catch (cause) {
      toast.error(getErrorMessage(cause, "The category image URL could not be updated."))
    } finally {
      setUpdatingId(null)
    }
  }

  const activeCount = categories?.filter((category) => category.active).length ?? 0

  return <>
    <AdminPageHeader
      title="Categories"
      description="Manage the product categories sellers can choose when creating listings. At least one category must stay active."
      meta={categories && <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{activeCount} active · {categories.length} total</span>}
    />

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TagsIcon className="size-5" />Create a category</CardTitle>
        <CardDescription>New categories are activated immediately and become available to sellers.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={createCategory} className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="category-name">Name</Label>
            <Input id="category-name" value={name} onChange={(event) => {
              const nextName = event.target.value
              setName(nextName)
              if (!slugEdited) setSlug(slugFromName(nextName))
            }} minLength={2} maxLength={80} required placeholder="Phones & Gadgets" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-slug">Slug</Label>
            <Input id="category-slug" value={slug} onChange={(event) => {
              setSlug(slugFromName(event.target.value))
              setSlugEdited(true)
            }} minLength={2} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="phones-gadgets" />
            <p className="text-xs text-muted-foreground">Used in category links. Lowercase letters, numbers, and hyphens only.</p>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="category-description">Description</Label>
            <Textarea id="category-description" value={description} onChange={(event) => setDescription(event.target.value)} minLength={2} maxLength={500} required rows={3} placeholder="Describe the kinds of products in this category." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-image">Image URL <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="category-image" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-order">Display order</Label>
            <Input id="category-order" type="number" min={0} step={1} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} required />
          </div>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating ? <><Loader2Icon className="animate-spin" />Creating…</> : <><CheckIcon />Create active category</>}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    {isLoading ? <AdminTableSkeleton label="Loading categories" /> : error ? <AdminError error={error} title="Unable to load categories" onRetry={() => mutate()} retrying={isValidating} /> : categories?.length ? <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">Category</th><th className="p-3">Image URL</th><th className="p-3">Slug</th><th className="p-3">Products</th><th className="p-3">Order</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
        <tbody>{categories.map((category) => <tr key={category.id} className="border-b last:border-0">
          <td className="p-3"><span className="font-medium">{category.name}</span><span className="block max-w-lg text-xs text-muted-foreground">{category.description}</span></td>
          <td className="p-3">
            {editingId === category.id ? <div className="flex min-w-64 items-center gap-2">
              <Input aria-label={`${category.name} image URL`} type="url" value={editImageUrl} onChange={(event) => setEditImageUrl(event.target.value)} placeholder="https://…" />
              <Button size="icon" aria-label="Save image URL" disabled={!!updatingId} onClick={() => void saveCategoryImage(category)}>{updatingId === category.id ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}</Button>
              <Button size="icon" variant="ghost" aria-label="Cancel editing image URL" disabled={!!updatingId} onClick={() => setEditingId(null)}><XIcon /></Button>
            </div> : <div className="flex max-w-xs items-center gap-2">
              <span className="truncate text-xs text-muted-foreground">{category.imageUrl || "—"}</span>
              <Button size="icon" variant="ghost" aria-label={`Edit ${category.name} image URL`} onClick={() => startEditing(category)}><PencilIcon /></Button>
            </div>}
          </td>
          <td className="p-3 font-mono text-xs">{category.slug}</td>
          <td className="p-3">{category._count?.products ?? 0}</td>
          <td className="p-3">{category.sortOrder}</td>
          <td className="p-3"><AdminStatusBadge status={category.active ? "ACTIVE" : "INACTIVE"} /></td>
          <td className="p-3 text-right"><Button size="sm" variant={category.active ? "outline" : "default"} disabled={!!updatingId || !!editingId} onClick={() => void toggleCategory(category)}>
            {updatingId === category.id && <Loader2Icon className="animate-spin" />}
            {updatingId === category.id ? "Saving…" : category.active ? "Deactivate" : "Activate"}
          </Button></td>
        </tr>)}</tbody>
      </table>
    </div> : <AdminEmptyState icon={TagsIcon} title="No categories yet" description="Create an active category above so sellers can start listing products." />}
  </>
}
