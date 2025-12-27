import { betterAuth } from "better-auth"
import { db } from "@/lib/db"
import { users, sessions, accounts, verifications } from "@/lib/db/schema"

// Better Auth configuration for BidForge
export const auth = betterAuth({
  database: {
    provider: "postgres",
    db,
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendEmailVerificationOnSignUp: async ({ user, url }) => {
      // Email verification is handled by email service
      await sendVerificationEmail(user.email, url)
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update every 24 hours
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "SUBCONTRACTOR",
      },
      companyId: {
        type: "string",
        required: false,
      },
    },
  },
})

import { sendVerificationEmail } from "@/lib/utils/email"

// Helper to get current user from session
export async function getCurrentUser(sessionToken?: string) {
  if (!sessionToken) return null

  try {
    const session = await auth.api.getSession({
      headers: {
        cookie: `session=${sessionToken}`,
      },
    })

    return session?.user || null
  } catch (error) {
    // Error getting current user
    return null
  }
}
