import { NextRequest } from 'next/server'
import { cache } from '@/lib/cache/redis'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxAttempts: number // Maximum attempts per window
  keyPrefix: string // Prefix for the rate limit key
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
}

export interface RateLimitResult {
  allowed: boolean
  resetTime?: number
  remaining?: number
  totalHits?: number
}

export function getRateLimitKey(request: NextRequest, prefix: string): string {
  // Extract IP address from various headers (prioritize real IP)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare
  const xForwardedFor = request.headers.get('x-forwarded-for')
  
  let ip = 'unknown'
  
  if (cfConnectingIp) {
    ip = cfConnectingIp
  } else if (realIp) {
    ip = realIp
  } else if (forwarded) {
    ip = forwarded.split(',')[0].trim()
  } else if (xForwardedFor) {
    ip = xForwardedFor.split(',')[0].trim()
  }
  
  // For authenticated requests, also include user ID if available
  const authToken = request.cookies.get('auth-token')?.value
  const userSuffix = authToken ? `:${authToken.slice(-8)}` : ''
  
  return `ratelimit:${prefix}:${ip}${userSuffix}`
}

export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  try {
    const now = Date.now()
    const windowStart = now - config.windowMs
    const resetTime = now + config.windowMs
    
    // Use Redis for distributed rate limiting
    const currentCount = await cache.incr(key, Math.ceil(config.windowMs / 1000))
    
    if (currentCount === 1) {
      // First request in window, set expiration
      await cache.set(key, currentCount, Math.ceil(config.windowMs / 1000))
    }
    
    const allowed = currentCount <= config.maxAttempts
    const remaining = Math.max(0, config.maxAttempts - currentCount)
    
    return {
      allowed,
      remaining,
      resetTime,
      totalHits: currentCount
    }
  } catch (error) {
    // Rate limit check error for key
    // Fail open - allow request if Redis is down
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetTime: Date.now() + config.windowMs
    }
  }
}

// Advanced rate limiting with sliding window
export async function checkSlidingWindowRateLimit(
  key: string, 
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const now = Date.now()
    const windowStart = now - config.windowMs
    const pipeline = [
      // Remove old entries
      ['zremrangebyscore', key, 0, windowStart],
      // Count current entries
      ['zcard', key],
      // Add current request
      ['zadd', key, now, `${now}-${Math.random()}`],
      // Set expiration
      ['expire', key, Math.ceil(config.windowMs / 1000)]
    ]
    
    // Execute pipeline (would need Redis pipeline support)
    const currentCount = await cache.incr(key, Math.ceil(config.windowMs / 1000))
    
    const allowed = currentCount <= config.maxAttempts
    const remaining = Math.max(0, config.maxAttempts - currentCount)
    const resetTime = now + config.windowMs
    
    return {
      allowed,
      remaining,
      resetTime,
      totalHits: currentCount
    }
  } catch (error) {
    // Sliding window rate limit error
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetTime: Date.now() + config.windowMs
    }
  }
}

// Predefined rate limit configurations optimized for high traffic
export const RATE_LIMITS = {
  // Authentication endpoints
  REGISTRATION: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    keyPrefix: 'register'
  } as const,
  EMAIL_VERIFICATION: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 10,
    keyPrefix: 'verify'
  } as const,
  RESEND_CODE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3,
    keyPrefix: 'resend'
  } as const,
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 10, // Increased for legitimate users
    keyPrefix: 'login'
  } as const,
  
  // API endpoints
  API_GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 100, // 100 requests per minute
    keyPrefix: 'api'
  },
  API_UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 10, // 10 uploads per minute
    keyPrefix: 'upload'
  },
  API_SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 60, // 60 searches per minute
    keyPrefix: 'search'
  },
  
  // WebSocket connections
  WEBSOCKET_CONNECT: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 10, // 10 connection attempts per minute
    keyPrefix: 'ws_connect'
  },
  WEBSOCKET_MESSAGE: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 120, // 120 messages per minute (2 per second)
    keyPrefix: 'ws_message'
  },
  
  // Password reset
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3,
    keyPrefix: 'password_reset'
  },
  
  // Contact/support
  CONTACT_FORM: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 5,
    keyPrefix: 'contact'
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

// IP whitelist for trusted sources (load balancers, CDN, etc.)
const TRUSTED_IPS = new Set([
  '127.0.0.1',
  '::1',
  // Add your load balancer IPs here
])

export function isTrustedIP(ip: string): boolean {
  return TRUSTED_IPS.has(ip)
}

// Adaptive rate limiting based on system load
export async function getAdaptiveRateLimit(baseConfig: RateLimitConfig): Promise<RateLimitConfig> {
  try {
    // Get system metrics (would integrate with monitoring)
    const systemLoad = 0.5 // Placeholder - get from monitoring
    const redisHealth = await cache.ping()
    
    let multiplier = 1
    
    if (systemLoad > 0.8) {
      multiplier = 0.5 // Reduce limits when system is under high load
    } else if (systemLoad < 0.3 && redisHealth) {
      multiplier = 1.5 // Increase limits when system is healthy
    }
    
    return {
      ...baseConfig,
      maxAttempts: Math.floor(baseConfig.maxAttempts * multiplier)
    }
  } catch (error) {
    // Adaptive rate limit error
    return baseConfig
  }
}