import {
  LayoutDashboardIcon,
  LifeBuoyIcon,
  PackageIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  StoreIcon,
  TagsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

export interface AdminNavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

export interface AdminNavGroup {
  label: string
  items: AdminNavItem[]
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon, exact: true }],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/sellers", label: "Seller applications", icon: StoreIcon },
      { href: "/admin/support", label: "Support inbox", icon: LifeBuoyIcon },
      { href: "/admin/orders", label: "Orders", icon: ShoppingCartIcon },
    ],
  },
  {
    label: "Catalog & people",
    items: [
      { href: "/admin/users", label: "Users", icon: UsersIcon },
      { href: "/admin/admins", label: "Administrators", icon: ShieldCheckIcon },
      { href: "/admin/products", label: "Products", icon: PackageIcon },
      { href: "/admin/categories", label: "Categories", icon: TagsIcon },
    ],
  },
  {
    label: "System",
    items: [{ href: "/admin/settings", label: "Settings", icon: SettingsIcon }],
  },
]

export function isNavItemActive(item: AdminNavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function findActiveNavItem(pathname: string) {
  return ADMIN_NAV.flatMap((group) => group.items).find((item) => isNavItemActive(item, pathname)) ?? null
}
