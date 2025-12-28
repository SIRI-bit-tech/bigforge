import { betterAuth } from "better-auth"
import { db } from "@/lib/db"
import { users, verificationCodes } from "@/lib/db/schema"

// Better Auth configuration for BidForge
export const auth = betterAuth({
  database: {
    provider: "postgres",
    db,
    schema: {
      user: users,
      // Note: Better Auth will create its own session and account tables
      verification: verificationCodes,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendEmailVerificationOnSignUp: async ({ user, url }: { user: any; url: string }) => {
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

// Email verification function
async function sendVerificationEmail(email: string, url: string) {
  // Import here to avoid circular dependency
  const { sendEmail, emailTemplates } = await import("@/lib/utils/email")
  
  await sendEmail({
    to: email,
    subject: "Verify your BidForge account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #708090;">Verify Your Email</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="${url}" style="display: inline-block; background: #FF8C42; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Verify Email</a>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `
  })
}

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
