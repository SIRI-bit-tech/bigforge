// This file enables global error handling for all API routes
import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'

// This will be imported by Next.js automatically for error handling
export async function handleAPIError(error: Error, request: NextRequest) {
  // Log all API errors with email notification
  logError('Global API Error', error, {
    endpoint: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    timestamp: new Date().toISOString(),
    severity: 'high',
    errorType: 'global_api_error',
    url: request.url
  })

  return NextResponse.json(
    { 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    },
    { status: 500 }
  )
}