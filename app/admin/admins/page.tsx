import type { Metadata } from "next"
import { AdminsView } from "@/components/admin/admins-view"

export const metadata: Metadata = { title: "Administrators" }

export default function AdministratorsPage() {
  return <AdminsView />
}
