// Core data types for BidForge application

export type UserRole = "CONTRACTOR" | "SUBCONTRACTOR"

export type ProjectStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "AWARDED" | "CANCELLED"

export type BidStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "SHORTLISTED" | "AWARDED" | "DECLINED" | "WITHDRAWN"

export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED"

export type DocumentType =
  | "BLUEPRINT"
  | "SPECIFICATION"
  | "CONTRACT"
  | "ADDENDUM"
  | "PHOTO"
  | "LICENSE"
  | "INSURANCE"
  | "OTHER"

export type TradeCategory =
  | "ELECTRICAL"
  | "PLUMBING"
  | "HVAC"
  | "CONCRETE"
  | "FRAMING"
  | "ROOFING"
  | "DRYWALL"
  | "FLOORING"
  | "PAINTING"
  | "LANDSCAPING"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  companyId: string
  password?: string // Hashed password
  emailVerified: boolean
  verificationCode?: string
  verificationCodeExpiry?: Date
  passwordResetToken?: string
  passwordResetExpiry?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Company {
  id: string
  name: string
  type: string
  address: string
  phone: string
  website?: string
  description?: string
  logo?: string
  trades: TradeCategory[]
  certifications: Certification[]
  createdAt: Date
}

export interface Project {
  id: string
  title: string
  description: string
  location: string
  budget: number
  startDate: Date
  endDate: Date
  deadline: Date
  status: ProjectStatus
  createdBy: string
  trades: TradeCategory[]
  createdAt: Date
  updatedAt: Date
}

export interface Bid {
  id: string
  projectId: string
  subcontractorId: string
  totalAmount: number
  status: BidStatus
  notes?: string
  submittedAt?: Date
  updatedAt: Date
  lineItems: LineItem[]
  alternates: Alternate[]
}

export interface LineItem {
  id: string
  bidId: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  notes?: string
}

export interface Alternate {
  id: string
  bidId: string
  description: string
  adjustmentAmount: number
  notes?: string
}

export interface Document {
  id: string
  projectId: string
  name: string
  type: DocumentType
  url: string
  size: number
  uploadedBy: string
  uploadedAt: Date
  version: number
}

export interface Invitation {
  id: string
  projectId: string
  subcontractorId: string
  status: InvitationStatus
  sentAt: Date
  respondedAt?: Date
}

export interface Message {
  id: string
  projectId: string
  bidId?: string
  senderId: string
  receiverId: string
  text: string
  sentAt: Date
  read: boolean
}

export interface Certification {
  id: string
  companyId: string
  type: string
  number: string
  issueDate: Date
  expiryDate: Date
  documentUrl?: string
}

export interface Notification {
  id: string
  userId: string
  type: "BID_SUBMITTED" | "BID_AWARDED" | "INVITATION" | "DEADLINE" | "MESSAGE"
  title: string
  message: string
  read: boolean
  createdAt: Date
  link?: string
}
