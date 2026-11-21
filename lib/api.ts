import type {
  AuthUser,
  AdminAccount,
  AdminProduct,
  AuthSession,
  MediaAccess,
  Order,
  SellerApplication,
  SellerApplicationDecision,
  SupportTicket,
  TicketStatus,
  PaginatedResult,
  AdminAuditEvent,
} from "@/lib/admin-types"

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "")

let accessToken: string | null = null
let refreshInFlight: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export class ApiError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; skipAuthRefresh?: boolean }

function extractMessage(payload: unknown): string | null {
  if (!payload) return null
  if (typeof payload === "string") return payload.length < 300 ? payload : null
  if (typeof payload !== "object") return null
  const record = payload as Record<string, unknown>
  const message = record.message
  if (typeof message === "string") return message
  if (Array.isArray(message) && typeof message[0] === "string") return message.join(", ")
  const error = record.error
  if (typeof error === "string") return error
  if (error && typeof error === "object") return extractMessage(error)
  return null
}

function defaultMessage(status: number) {
  switch (status) {
    case 400:
      return "The request was invalid."
    case 401:
      return "Your session has expired. Please sign in again."
    case 403:
      return "You do not have permission to perform this action."
    case 404:
      return "The requested resource was not found."
    case 409:
      return "This action conflicts with the current state of the resource."
    case 429:
      return "Too many requests. Please wait a moment and try again."
    default:
      return status >= 500 ? "The server encountered an error. Please try again." : "Request failed."
  }
}

function unwrap(payload: unknown) {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && "data" in payload) {
    return (payload as { data: unknown }).data
  }
  return payload
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
  retryAfterRefresh = true,
): Promise<T> {
  const { body, headers, skipAuthRefresh, ...init } = options
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    throw new ApiError("Network error. Check your connection and try again.", 0, error)
  }

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const error = new ApiError(extractMessage(payload) ?? defaultMessage(response.status), response.status, payload)
    if (
      response.status === 401 &&
      retryAfterRefresh &&
      !skipAuthRefresh &&
      path !== "/api/v1/auth/login" &&
      path !== "/api/v1/auth/refresh"
    ) {
      const token = await refreshAccessToken()
      if (token) return apiRequest<T>(path, options, false)
    }
    throw error
  }

  return unwrap(payload) as T
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    try {
      const payload = await apiRequest<{ accessToken?: string }>("/api/v1/auth/refresh", {
        method: "POST",
        skipAuthRefresh: true,
      }, false)
      const token = payload?.accessToken
      if (typeof token !== "string" || !token) {
        throw new ApiError("The server did not return an access token.", 502, payload)
      }
      setAccessToken(token)
      return token
    } catch (error) {
      setAccessToken(null)
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function toList<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>
    for (const key of keys) {
      if (Array.isArray(record[key])) return record[key] as T[]
    }
  }
  return []
}

function toEntity<T>(payload: unknown, key: string): T {
  if (payload && typeof payload === "object" && key in (payload as object)) {
    return (payload as Record<string, unknown>)[key] as T
  }
  return payload as T
}

/* Auth */

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    if (!accessToken && !(await refreshAccessToken())) return null
    const payload = await apiRequest("/api/v1/auth/me")
    return toEntity<AuthUser | null>(payload, "user")
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export async function login(email: string, password: string) {
  const payload = await apiRequest<{ accessToken?: string; user?: AuthUser | null }>(
    "/api/v1/auth/login",
    { method: "POST", body: { email, password }, skipAuthRefresh: true },
    false,
  )
  if (typeof payload?.accessToken !== "string" || !payload.accessToken) {
    throw new ApiError("The server did not return an access token.", 502, payload)
  }
  setAccessToken(payload.accessToken)
  return toEntity<AuthUser | null>(payload, "user")
}

export async function logout() {
  await apiRequest("/api/v1/auth/logout", { method: "POST" })
}

export function requestPasswordReset(email: string) {
  return apiRequest("/api/v1/auth/forgot-password", { method: "POST", body: { email: email.trim() } })
}

export function resetPassword(email: string, code: string, newPassword: string) {
  return apiRequest("/api/v1/auth/reset-password", {
    method: "POST",
    body: { email: email.trim(), code: code.trim(), newPassword },
  })
}

export async function listAdminSessions() {
  const payload = await apiRequest("/api/v1/auth/sessions")
  return toList<AuthSession>(payload, ["sessions", "items", "results"])
}

export function revokeOtherSessions() {
  return apiRequest("/api/v1/auth/sessions/revoke-others", { method: "POST" })
}

/* Admin account and product management */

export async function listAdminUsers({ q = "", page = 1, pageSize = 25, status = "", role = "" } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (q.trim()) params.set("q", q.trim())
  if (status) params.set("status", status)
  if (role) params.set("role", role)
  return apiRequest<PaginatedResult<AdminAccount>>(`/api/v1/admin/users?${params}`)
}

export function getAdminUser(id: string) {
  return apiRequest<AdminAccount>(`/api/v1/admin/users/${encodeURIComponent(id)}`)
}

export function updateAdminUserStatus(id: string, status: "ACTIVE" | "SUSPENDED") {
  return apiRequest(`/api/v1/admin/users/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status },
  })
}

export async function listAdminProducts({ q = "", page = 1, pageSize = 25, status = "" } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (q.trim()) params.set("q", q.trim())
  if (status) params.set("status", status)
  return apiRequest<PaginatedResult<AdminProduct>>(`/api/v1/admin/products?${params}`)
}

export function updateAdminProductStatus(id: string, status: "ACTIVE" | "PAUSED" | "ARCHIVED") {
  return apiRequest(`/api/v1/admin/products/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status },
  })
}

export function updateAdminUserRole(id: string, role: "ADMIN" | "SELLER" | "BUYER") {
  return apiRequest(`/api/v1/admin/users/${encodeURIComponent(id)}/role`, { method: "PATCH", body: { role } })
}

export function grantAdminByEmail(email: string) {
  return apiRequest(`/api/v1/admin/users/admins`, { method: "POST", body: { email: email.trim().toLowerCase() } })
}

export function revokeAdminAccess(id: string) {
  return apiRequest(`/api/v1/admin/users/${encodeURIComponent(id)}/admin-access`, { method: "DELETE" })
}

export function deleteAdminUser(id: string) {
  return apiRequest(`/api/v1/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export function listAdminUserSessions(id: string) {
  return apiRequest<AuthSession[]>(`/api/v1/admin/users/${encodeURIComponent(id)}/sessions`)
}

export function revokeAdminUserSession(userId: string, sessionId: string) {
  return apiRequest(`/api/v1/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" })
}

export function listAdminAuditEvents(targetId?: string) {
  const params = new URLSearchParams({ page: "1", pageSize: "100" })
  if (targetId) params.set("targetId", targetId)
  return apiRequest<PaginatedResult<AdminAuditEvent>>(`/api/v1/admin/audit-events?${params}`)
}

export function archiveAdminProduct(id: string) {
  return apiRequest(`/api/v1/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" })
}

/* Seller applications */

export async function listSellerApplications() {
  const payload = await apiRequest("/api/v1/admin/seller-applications")
  return toList<Record<string, unknown>>(payload, ["applications", "sellerApplications", "items", "results"])
    .map((application) => ({
      ...application,
      status: (application.status ?? "UNDER_REVIEW") as string,
      user: application.user as SellerApplication["user"],
      identityDocumentId: (application.idDocumentMediaId ?? application.identityDocumentId) as string | undefined,
      selfieId: (application.selfieMediaId ?? application.selfieId) as string | undefined,
      ownerBirthDate: (application.ownerBirthDate ?? application.dateOfBirth) as string | undefined,
    })) as SellerApplication[]
}

export function reviewSellerApplication(id: string, decision: SellerApplicationDecision, reviewNote?: string) {
  const note = reviewNote?.trim()
  return apiRequest(`/api/v1/admin/seller-applications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: note ? { decision, reviewNote: note } : { decision },
  })
}

export function approveSellerApplication(id: string, reviewNote?: string) {
  return reviewSellerApplication(id, "APPROVED", reviewNote)
}

export function rejectSellerApplication(id: string, reviewNote?: string) {
  return reviewSellerApplication(id, "REJECTED", reviewNote)
}

export async function getSellerApplicationMediaAccess(applicationId: string, mediaId: string): Promise<MediaAccess> {
  const payload = await apiRequest<Record<string, unknown>>(
    `/api/v1/admin/seller-applications/${encodeURIComponent(applicationId)}/media/${encodeURIComponent(mediaId)}/access`,
  )
  const url = (payload?.url ?? payload?.signedUrl ?? payload?.accessUrl) as string | undefined
  if (!url) throw new ApiError("The document is unavailable.", 404, payload)
  return {
    url,
    expiresAt: (payload?.expiresAt as string | undefined) ?? null,
    mimeType: (payload?.mimeType ?? payload?.contentType ?? payload?.resourceType) as string | undefined,
  }
}

/* Support */

export async function listAdminSupportTickets() {
  const payload = await apiRequest("/api/v1/support/tickets/admin")
  return toList<SupportTicket>(payload, ["tickets", "items", "results"])
}

export async function getSupportTicket(id: string) {
  const payload = await apiRequest(`/api/v1/support/tickets/${encodeURIComponent(id)}`)
  return toEntity<SupportTicket>(payload, "ticket")
}

export function replyToSupportTicket(id: string, message: string) {
  return apiRequest(`/api/v1/support/tickets/${encodeURIComponent(id)}/replies`, {
    method: "POST",
    body: { message: message.trim() },
  })
}

export function updateSupportTicketStatus(id: string, status: TicketStatus) {
  return apiRequest(`/api/v1/support/tickets/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status },
  })
}

/* Orders */

export const ADMIN_ORDERS_LIST_PATH = "/api/v1/orders/admin"

export async function listAdminOrders() {
  const payload = await apiRequest(ADMIN_ORDERS_LIST_PATH)
  return toList<Order>(payload, ["orders", "items", "results"])
}

export async function getOrder(id: string) {
  const payload = await apiRequest(`/api/v1/orders/${encodeURIComponent(id)}`)
  return toEntity<Order>(payload, "order")
}

export function markOrderDelivered(id: string) {
  return apiRequest(`/api/v1/orders/${encodeURIComponent(id)}/admin-delivered`, { method: "PATCH" })
}

export function adminConfirmOrderDelivery(id: string) {
  return apiRequest(`/api/v1/orders/${encodeURIComponent(id)}/admin-confirm-delivery`, { method: "POST" })
}
