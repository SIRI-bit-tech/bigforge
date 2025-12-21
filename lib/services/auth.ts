import bcrypt from 'bcryptjs'
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

// Re-export shared validation and verification functions
export { validatePasswordStrength }
export { generateVerificationCode, generateVerificationData }