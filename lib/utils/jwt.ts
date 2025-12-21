import jwt, { SignOptions } from "jsonwebtoken"

// Secure JWT secret retrieval - fails fast if not configured
export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required but not configured. Please set JWT_SECRET in your environment variables.')
  }
  return secret
}

// JWT token utilities for GraphQL authentication
export function signJWT(payload: object, expiresIn = "7d"): string {
  return jwt.sign(payload, getJWTSecret(), { expiresIn } as SignOptions)
}

// Type guard to validate JWT payload structure
function isValidJWTPayload(payload: unknown): payload is { userId: string; role: string; companyId?: string } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as any).userId === 'string' &&
    typeof (payload as any).role === 'string' &&
    ((payload as any).companyId === undefined || typeof (payload as any).companyId === 'string')
  )
}

// Note: verifyJWT has been moved to lib/services/auth.ts for better security validation
// Import verifyJWT from '@/lib/services/auth' instead of this file
