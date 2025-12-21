// Client-side authentication utilities
// This file is safe to use in the browser

import { validatePasswordStrength } from '@/lib/validation/password'

// Re-export shared validation function
export { validatePasswordStrength }

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Format verification code (add spaces for readability)
export function formatVerificationCode(code: string): string {
  return code.replace(/(\d{3})(\d{3})/, '$1 $2')
}