import type { LucideIcon } from "lucide-react"
import { CircleDashedIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminEmptyState } from "./admin-empty-state"
import { AdminPageHeader } from "./admin-page-header"

export interface RequiredEndpoint {
  name: string
  description: string
}

interface AdminEndpointPlaceholderProps {
  title: string
  description: string
  icon: LucideIcon
  emptyTitle: string
  emptyDescription: string
  endpoints: RequiredEndpoint[]
}

export function AdminEndpointPlaceholder({
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
  endpoints,
}: AdminEndpointPlaceholderProps) {
  return (
    <>
      <AdminPageHeader title={title} description={description} meta={<Badge variant="secondary">Not connected</Badge>} />
      <div className="grid gap-6 lg:grid-cols-5">
        <AdminEmptyState icon={icon} title={emptyTitle} description={emptyDescription} className="lg:col-span-3" />
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Required backend endpoints</CardTitle>
            <CardDescription>
              This section stays read-only until each endpoint below is available from the API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {endpoints.map((endpoint) => (
                <li key={endpoint.name} className="flex items-start gap-3">
                  <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium">{endpoint.name}</span>
                    <span className="text-xs text-muted-foreground text-pretty">{endpoint.description}</span>
                  </div>
                  <Badge variant="outline" className="ml-auto shrink-0">
                    Required
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
