// Centralized API error handling wrapper for Next.js API routes
import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'

// Error handler wrapper that API routes can use in their try/catch blocks
export function handleAPIError(error: Error, request: NextRequest, context?: Record<string, any>) {
  // Log all API errors with email notification
  logError('API Error', error, {
    endpoint: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    timestamp: new Date().toISOString(),
    severity: 'high',
    errorType: 'api_error',
    url: request.url,
    ...context
  })

  return NextResponse.json(
    { 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    },
    { status: 500 }
  )
}

// Re-export the canonical withErrorHandler implementation
export { withErrorHandler } from '@/lib/middleware/error-handler'