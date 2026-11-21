export type UserRole = "ADMIN" | "SELLER" | "BUYER" | (string & {})

export interface AuthUser {
  id: string
  email: string
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
  role: UserRole
}

export interface AdminAccount {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  status: string
  createdAt: string
  emailVerifiedAt?: string | null
  updatedAt?: string
  store?: { id: string; name: string; slug?: string; active?: boolean; verified?: boolean } | null
  sellerApplication?: { id: string; status: string; submittedAt?: string | null } | null
}

export interface AdminProduct {
  id: string
  slug: string
  name: string
  brand?: string | null
  status: string
  price: number
  stock: number
  createdAt: string
  category?: { name?: string | null; slug?: string | null } | null
  seller?: StoreRef | null
}

export interface AuthSession {
  id: string
  userAgent?: string | null
  ipAddress?: string | null
  createdAt: string
  lastUsedAt?: string | null
  expiresAt: string
  revokedAt?: string | null
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface AdminAuditEvent {
  id: string
  actorId?: string | null
  action: string
  targetType: string
  targetId?: string | null
  metadata?: Record<string, unknown>
  createdAt: string
  actor?: PersonRef | null
}

export interface PersonRef {
  id?: string
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
}

export interface MediaRef {
  id: string
  mimeType?: string | null
  type?: string | null
}

export interface MediaAccess {
  url: string
  expiresAt: string | null
  mimeType?: string
}

export type SellerApplicationDecision = "APPROVED" | "REJECTED"

export interface SellerApplication {
  id: string
  status: string
  brandName?: string | null
  handle?: string | null
  storeHandle?: string | null
  description?: string | null
  categories?: (string | { id?: string; name: string })[] | null
  businessType?: string | null
  registrationNumber?: string | null
  businessPhone?: string | null
  businessEmail?: string | null
  country?: string | null
  region?: string | null
  city?: string | null
  address?: string | null
  ownerName?: string | null
  ownerFirstName?: string | null
  ownerLastName?: string | null
  ownerBirthDate?: string | null
  dateOfBirth?: string | null
  idType?: string | null
  identityDocument?: MediaRef | null
  identityDocumentId?: string | null
  selfie?: MediaRef | null
  selfieId?: string | null
  bankName?: string | null
  accountName?: string | null
  reviewNote?: string | null
  email?: string | null
  user?: PersonRef | null
  createdAt?: string | null
  submittedAt?: string | null
}

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export interface SupportReply {
  id: string
  message?: string | null
  body?: string | null
  isAdmin?: boolean
  isStaff?: boolean
  authorRole?: string | null
  senderRole?: string | null
  author?: (PersonRef & { role?: string | null }) | null
  createdAt?: string | null
}

export interface SupportTicket {
  id: string
  ticketNumber?: string | null
  name?: string | null
  customerName?: string | null
  email?: string | null
  topic?: string | null
  subject?: string | null
  message?: string | null
  status: TicketStatus
  orderId?: string | null
  orderNumber?: string | null
  order?: { id?: string; orderNumber?: string | null } | null
  user?: PersonRef | null
  replies?: SupportReply[] | null
  messages?: SupportReply[] | null
  createdAt?: string | null
  updatedAt?: string | null
}

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PLACED",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export interface AddressSnapshot {
  fullName?: string | null
  name?: string | null
  phone?: string | null
  line1?: string | null
  line2?: string | null
  street?: string | null
  address?: string | null
  city?: string | null
  region?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
}

export interface StoreRef {
  id?: string
  storeName?: string | null
  brandName?: string | null
  name?: string | null
  handle?: string | null
  email?: string | null
}

export interface OrderItem {
  id: string
  productName?: string | null
  title?: string | null
  name?: string | null
  product?: { title?: string | null; name?: string | null } | null
  quantity?: number | null
  unitPrice?: number | string | null
  price?: number | string | null
  total?: number | string | null
  lineTotal?: number | string | null
  seller?: StoreRef | null
}

export interface Order {
  id: string
  orderNumber?: string | null
  status: string
  paymentStatus?: string | null
  shipmentStatus?: string | null
  payment?: { status?: string | null; method?: string | null; provider?: string | null; amount?: number | string | null } | null
  shipment?: {
    status?: string | null
    carrier?: string | null
    trackingNumber?: string | null
    shippedAt?: string | null
    deliveredAt?: string | null
  } | null
  buyer?: PersonRef | null
  user?: PersonRef | null
  shippingAddress?: AddressSnapshot | null
  addressSnapshot?: AddressSnapshot | null
  items?: OrderItem[] | null
  subtotal?: number | string | null
  shippingFee?: number | string | null
  discount?: number | string | null
  total?: number | string | null
  totalAmount?: number | string | null
  currency?: string | null
  seller?: StoreRef | null
  store?: StoreRef | null
  createdAt?: string | null
  paidAt?: string | null
  deliveredAt?: string | null
  buyerConfirmedAt?: string | null
  adminConfirmedAt?: string | null
}
