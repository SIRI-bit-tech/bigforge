import { db } from "@/lib/db"
import { companies, certifications, insurance } from "@/lib/db/schema"
import { eq, like, and } from "drizzle-orm"
import { cache } from "@/lib/cache/redis"

// Subcontractor resolver for directory and profile queries
export const subcontractorResolvers = {
  Query: {
    // Search subcontractors with filtering
    subcontractors: async (_: any, args: any, context: any) => {
      const { trade, location, certified, insured, limit = 20, offset = 0 } = args

      // Build cache key
      const cacheKey = `subcontractors:${JSON.stringify(args)}`
      const cached = await cache.get(cacheKey)
      if (cached) return cached

      let whereConditions = [eq(companies.type, "SUBCONTRACTOR")]

      // Apply filters
      if (location) {
        whereConditions.push(like(companies.address, `%${location}%`))
      }

      const results = await db
        .select()
        .from(companies)
        .where(and(...whereConditions))
        .limit(limit)
        .offset(offset)

      // Cache for 5 minutes
      await cache.set(cacheKey, results, 300)

      return results
    },

    // Get single subcontractor profile
    subcontractor: async (_: any, { id }: any, context: any) => {
      const cacheKey = `subcontractor:${id}`
      const cached = await cache.get(cacheKey)
      if (cached) return cached

      // Use DataLoader to batch query
      const company = await context.loaders.companyLoader.load(id)

      if (!company || company.type !== "SUBCONTRACTOR") {
        throw new Error("Subcontractor not found")
      }

      // Cache for 10 minutes
      await cache.set(cacheKey, company, 600)

      return company
    },
  },

  Subcontractor: {
    // Resolve certifications for subcontractor
    certifications: async (parent: any, _: any, context: any) => {
      return await db.select().from(certifications).where(eq(certifications.companyId, parent.id))
    },

    // Resolve insurance documents
    insurance: async (parent: any, _: any, context: any) => {
      return await db.select().from(insurance).where(eq(insurance.companyId, parent.id))
    },

    // Resolve past projects
    pastProjects: async (parent: any, _: any, context: any) => {
      return await context.loaders.companyProjectsLoader.load(parent.id)
    },

    // Calculate win rate
    winRate: async (parent: any, _: any, context: any) => {
      const bids = await context.loaders.companyBidsLoader.load(parent.id)
      if (!bids || bids.length === 0) return 0

      const awardedBids = bids.filter((bid: any) => bid.status === "AWARDED")
      return (awardedBids.length / bids.length) * 100
    },
  },
}
