import { pgTable, uuid, text, varchar, timestamp, integer, decimal, boolean, pgEnum } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Enums for database
export const userRoleEnum = pgEnum("user_role", ["CONTRACTOR", "SUBCONTRACTOR"])
export const projectStatusEnum = pgEnum("project_status", ["DRAFT", "PUBLISHED", "CLOSED", "AWARDED"])
export const bidStatusEnum = pgEnum("bid_status", [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "AWARDED",
  "DECLINED",
  "WITHDRAWN",
])
export const invitationStatusEnum = pgEnum("invitation_status", ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED"])
export const documentTypeEnum = pgEnum("document_type", [
  "BLUEPRINT",
  "SPECIFICATION",
  "CONTRACT",
  "ADDENDUM",
  "PHOTO",
  "OTHER",
])

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Companies table
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 255 }),
  description: text("description"),
  logo: text("logo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Trades table
export const trades = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 100 }),
  description: text("description"),
})

// Projects table
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  budgetMin: decimal("budget_min", { precision: 15, scale: 2 }),
  budgetMax: decimal("budget_max", { precision: 15, scale: 2 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  deadline: timestamp("deadline").notNull(),
  status: projectStatusEnum("status").default("DRAFT").notNull(),
  createdById: uuid("created_by_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Project trades junction table
export const projectTrades = pgTable("project_trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  tradeId: uuid("trade_id")
    .references(() => trades.id)
    .notNull(),
})

// Documents table
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: documentTypeEnum("type").notNull(),
  url: text("url").notNull(),
  size: integer("size"),
  version: integer("version").default(1),
  uploadedById: uuid("uploaded_by_id")
    .references(() => users.id)
    .notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
})

// Bids table
export const bids = pgTable("bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  subcontractorId: uuid("subcontractor_id")
    .references(() => users.id)
    .notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: bidStatusEnum("status").default("DRAFT").notNull(),
  notes: text("notes"),
  completionTime: integer("completion_time"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Line items table
export const lineItems = pgTable("line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bidId: uuid("bid_id")
    .references(() => bids.id, { onDelete: "cascade" })
    .notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
})

// Alternates table
export const alternates = pgTable("alternates", {
  id: uuid("id").primaryKey().defaultRandom(),
  bidId: uuid("bid_id")
    .references(() => bids.id, { onDelete: "cascade" })
    .notNull(),
  description: text("description").notNull(),
  adjustmentAmount: decimal("adjustment_amount", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
})

// Invitations table
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  subcontractorId: uuid("subcontractor_id")
    .references(() => users.id)
    .notNull(),
  status: invitationStatusEnum("status").default("PENDING").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
})

// Messages table
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  bidId: uuid("bid_id").references(() => bids.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .references(() => users.id)
    .notNull(),
  receiverId: uuid("receiver_id")
    .references(() => users.id)
    .notNull(),
  text: text("text").notNull(),
  read: boolean("read").default(false),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
})

// Certifications table
export const certifications = pgTable("certifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  number: varchar("number", { length: 100 }),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  documentUrl: text("document_url"),
})

// Insurance table
export const insurance = pgTable("insurance", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  provider: varchar("provider", { length: 255 }),
  policyNumber: varchar("policy_number", { length: 100 }),
  coverage: decimal("coverage", { precision: 15, scale: 2 }),
  expiryDate: timestamp("expiry_date"),
  documentUrl: text("document_url"),
})

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  link: text("link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Email verification codes table
export const verificationCodes = pgTable("verification_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Company trades junction table
export const companyTrades = pgTable("company_trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  tradeId: uuid("trade_id")
    .references(() => trades.id)
    .notNull(),
})

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  createdProjects: many(projects),
  bids: many(bids),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  notifications: many(notifications),
}))

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  certifications: many(certifications),
  insurance: many(insurance),
  trades: many(companyTrades),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [projects.createdById],
    references: [users.id],
  }),
  trades: many(projectTrades),
  documents: many(documents),
  bids: many(bids),
  invitations: many(invitations),
  messages: many(messages),
}))

export const bidsRelations = relations(bids, ({ one, many }) => ({
  project: one(projects, {
    fields: [bids.projectId],
    references: [projects.id],
  }),
  subcontractor: one(users, {
    fields: [bids.subcontractorId],
    references: [users.id],
  }),
  lineItems: many(lineItems),
  alternates: many(alternates),
  messages: many(messages),
}))

export const tradesRelations = relations(trades, ({ many }) => ({
  projects: many(projectTrades),
  companies: many(companyTrades),
}))
