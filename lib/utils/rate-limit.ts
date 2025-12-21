import { NextRequest } from 'next/server'

// Rate limiting store (in production, use Redis or a proper rate limiting service)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxAttempts: number // Maximum attempts per window
  keyPrefix: string // Prefix for the rate limit key
}

export interface RateLimitResult {
  allowed: boolean
  resetTime?: number
  remaining?: number
}

export function getRateLimitKey(request: NextRequest, prefix: string): string {
  // Extract IP address from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown'
  return `${prefix}:${ip}`
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  // Clean up expired records periodically (simple cleanup)
  if (Math.random() < 0.01) { // 1% chance to clean up
    cleanupExpiredRecords()
  }

  if (!record || now > record.resetTime) {
    // First attempt or window expired
    const newRecord = { count: 1, resetTime: now + config.windowMs }
    rateLimitStore.set(key, newRecord)
    return { 
      allowed: true, 
      remaining: config.maxAttempts - 1,
      resetTime: newRecord.resetTime
    }
  }

  if (record.count >= config.maxAttempts) {
    return { 
      allowed: false, 
      resetTime: record.resetTime,
      remaining: 0
    }
  }

  // Increment count
  record.count++
  rateLimitStore.set(key, record)
  
  return { 
    allowed: true, 
    remaining: config.maxAttempts - record.count,
    resetTime: record.resetTime
  }
}

function cleanupExpiredRecords(): void {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  REGISTRATION: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    keyPrefix: 'register'
  },
  EMAIL_VERIFICATION: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 10,
    keyPrefix: 'verify'
  },
  RESEND_CODE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3,
    keyPrefix: 'resend'
  },
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    keyPrefix: 'login'
  }
} as const

// Helper function to format time remaining
export function formatTimeRemaining(resetTime: number): string {
  const remaining = Math.ceil((resetTime - Date.now()) / 1000 / 60) // minutes
  if (remaining <= 1) {
    return 'less than 1 minute'
  }
  return `${remaining} minutes`
}