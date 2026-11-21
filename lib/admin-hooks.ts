"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import {
  listAdminProducts,
  listAdminSessions,
  getOrder,
  getSupportTicket,
  listAdminOrders,
  listAdminSupportTickets,
  listAdminUsers,
  listSellerApplications,
} from "@/lib/api"

export const adminKeys = {
  sellerApplications: "admin/seller-applications",
  supportTickets: "admin/support-tickets",
  supportTicket: (id: string) => ["admin/support-ticket", id] as const,
  orders: "admin/orders",
  users: "admin/users",
  products: "admin/products",
  sessions: "admin/sessions",
  order: (id: string) => ["admin/order", id] as const,
}

export function useSellerApplications() {
  return useSWR(adminKeys.sellerApplications, listSellerApplications)
}

export function useAdminSupportTickets() {
  return useSWR(adminKeys.supportTickets, listAdminSupportTickets)
}

export function useSupportTicket(id: string | null) {
  return useSWR(id ? adminKeys.supportTicket(id) : null, ([, ticketId]) => getSupportTicket(ticketId))
}

export function useAdminOrders() {
  return useSWR(adminKeys.orders, listAdminOrders)
}

export function useAdminUsers(params: { q?: string; page?: number; pageSize?: number; status?: string; role?: string } = {}) {
  return useSWR([adminKeys.users, params], ([, options]) => listAdminUsers(options))
}

export function useAdminProducts(params: { q?: string; page?: number; pageSize?: number; status?: string } = {}) {
  return useSWR([adminKeys.products, params], ([, options]) => listAdminProducts(options))
}

export function useAdminSessions() {
  return useSWR(adminKeys.sessions, listAdminSessions)
}

export function useOrder(id: string | null) {
  return useSWR(id ? adminKeys.order(id) : null, ([, orderId]) => getOrder(orderId))
}

export function useUrlParam(key: string, defaultValue = "") {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const value = searchParams.get(key) ?? defaultValue

  const setValue = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (!next || next === defaultValue) params.delete(key)
      else params.set(key, next)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [defaultValue, key, pathname, router, searchParams],
  )

  return [value, setValue] as const
}
