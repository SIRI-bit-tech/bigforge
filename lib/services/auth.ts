import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { validatePasswordStrength } from '@/lib/validation/password'
import { generateVerificationCode, generateVerificationData } from '@/lib/validation/verification-code'

// This file should only be used on the server side
// Client-side code should use API routes instead

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12 // Higher salt rounds for better security
  return await bcrypt.hash(password, saltRounds)
}

// Password verification
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

// JWT token generation
export function generateJWT(payload: { userId: string; role: string }): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  
  return jwt.sign(payload, secret, {
    expiresIn: '30d',
    issuer: 'bidforge',
    audience: 'bidforge-users',
  })
}

// JWT token verification
export function verifyJWT(token: string): { userId: string; role: string } | null {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET is not configured')
    }
    
    const decoded = jwt.verify(token, secret, {
      issuer: 'bidforge',
      audience: 'bidforge-users',
    }) as { userId: string; role: string }
    
    return decoded
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

// Re-export shared validation and verification functions
export { validatePasswordStrength }
export { generateVerificationCode, generateVerificationData }