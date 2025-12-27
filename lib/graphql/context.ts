import type { YogaInitialContext } from "graphql-yoga"
import { db } from "@/lib/db"
import jwt from "jsonwebtoken"
import { getJWTSecret } from "@/lib/utils/jwt"
import {
  createUserLoader,
  createCompanyLoader,
  createProjectLoader,
  createBidLoader,
  createTradeLoader,
} from "./loaders"

export interface GraphQLContext extends YogaInitialContext {
  db: typeof db
  userId?: string
  userRole?: "CONTRACTOR" | "SUBCONTRACTOR"
  loaders: {
    user: ReturnType<typeof createUserLoader>
    company: ReturnType<typeof createCompanyLoader>
    project: ReturnType<typeof createProjectLoader>
    bid: ReturnType<typeof createBidLoader>
    trade: ReturnType<typeof createTradeLoader>
  }
}

// Create context for each request
export async function createContext(initialContext: YogaInitialContext): Promise<GraphQLContext> {
  const token = initialContext.request.headers.get("authorization")?.replace("Bearer ", "")

  let userId: string | undefined
  let userRole: "CONTRACTOR" | "SUBCONTRACTOR" | undefined

  if (token) {
    try {
      const decoded = jwt.verify(token, getJWTSecret(), {
        issuer: 'bidforge',
        audience: 'bidforge-users',
      }) as {
        userId: string
        role: "CONTRACTOR" | "SUBCONTRACTOR"
      }
      userId = decoded.userId
      userRole = decoded.role
    } catch (error) {
      // Invalid token
    }
  }

  return {
    ...initialContext,
    db,
    userId,
    userRole,
    loaders: {
      user: createUserLoader(),
      company: createCompanyLoader(),
      project: createProjectLoader(),
      bid: createBidLoader(),
      trade: createTradeLoader(),
    },
  }
}

// Helper to require authentication
export function requireAuth(context: GraphQLContext) {
  if (!context.userId) {
    throw new Error("Authentication required")
  }
  return context.userId
}

// Helper to require specific role
export function requireRole(context: GraphQLContext, role: "CONTRACTOR" | "SUBCONTRACTOR") {
  requireAuth(context)
  if (context.userRole !== role) {
    throw new Error(`This action requires ${role} role`)
  }
}
