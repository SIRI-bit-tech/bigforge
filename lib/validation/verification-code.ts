// Shared verification code utilities
// Uses cryptographically secure random generation

import crypto from 'crypto'

// Generate a 6-digit verification code using cryptographically secure random
export function generateVerificationCode(): string {
  const code = crypto.randomInt(0, 1_000_000)
  return String(code).padStart(6, '0')
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