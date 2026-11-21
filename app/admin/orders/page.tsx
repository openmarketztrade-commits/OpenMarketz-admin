import type { Metadata } from "next"
import { ShoppingCartIcon } from "lucide-react"
import { AdminEndpointPlaceholder } from "@/components/admin/admin-endpoint-placeholder"

export const metadata: Metadata = { title: "Orders" }

export default function OrdersPage() {
  return (
    <AdminEndpointPlaceholder
      title="Orders"
      description="Track marketplace orders and verify delivery."
      icon={ShoppingCartIcon}
      emptyTitle="Order review is not available yet"
      emptyDescription="The API supports buyer and seller order history and admin delivery confirmation, but does not expose an admin order list or order detail access."
      endpoints={[
        { name: "Admin order list", description: "Searchable orders across the marketplace with buyer, seller, payment, and shipment details." },
        { name: "Admin order detail", description: "Read an order and its items as an administrator." },
      ]}
    />
  )
}
