import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'

// Global error handler wrapper for API routes
export function withErrorHandler(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      return await handler(req, ...args)
    } catch (error) {
      // Log all unhandled errors with email notification
      logError('Unhandled API error', error, {
        endpoint: req.nextUrl.pathname,
        method: req.method,
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        timestamp: new Date().toISOString(),
        severity: 'high',
        errorType: 'unhandled_api_error'
      })

      // Return generic error response
      return NextResponse.json(
        { 
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
}

// Middleware to catch and log errors in API routes
export async function errorMiddleware(req: NextRequest) {
  // This will be used in middleware.ts to catch all API errors
  return NextResponse.next()
}