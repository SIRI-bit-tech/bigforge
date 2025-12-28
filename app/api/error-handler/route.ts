// Centralized API error handling wrapper for Next.js API routes
import { NextRequest, NextResponse } from 'next/server'
import { logError, logWarning, logInfo } from '@/lib/logger'

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

// POST handler for client-side error logging
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    // Add request context to the log data
    const logData = {
      ...data,
      clientIP: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      referer: request.headers.get('referer') || 'unknown'
    }

    // Route to appropriate logging function based on type and level
    switch (type) {
      case 'client_error':
        logError(`Client Error: ${data.message}`, data.error ? new Error(data.error) : undefined, logData)
        break
      case 'client_warning':
        logWarning(`Client Warning: ${data.message}`, logData)
        break
      case 'client_info':
        logInfo(`Client Info: ${data.message}`, logData)
        break
      default:
        logError(`Unknown Client Log Type: ${type}`, undefined, logData)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    // If client error logging fails, log the failure
    logError('Failed to process client error log', error as Error, {
      endpoint: '/api/error-handler',
      method: 'POST'
    })
    
    return NextResponse.json(
      { error: 'Failed to log client error' },
      { status: 500 }
    )
  }
}

// Re-export the canonical withErrorHandler implementation
export { withErrorHandler } from '@/lib/middleware/error-handler'