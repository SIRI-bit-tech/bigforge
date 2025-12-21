import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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

// Generate a 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Generate verification code with expiry
export function generateVerificationData(): {
  code: string
  expiresAt: Date
} {
  return {
    code: generateVerificationCode(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
  }
}

// Password strength validation
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}