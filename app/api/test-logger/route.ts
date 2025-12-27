import { NextRequest, NextResponse } from 'next/server'
import { logError, logInfo, logWarning } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    logInfo('Test logger endpoint accessed', {
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: true,
      message: 'Logger test completed - check your email for error notifications',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logError('Failed to process logger test', error)
    return NextResponse.json({
      success: false,
      error: 'Logger test failed'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const testType = body.type || 'error'
    
    switch (testType) {
      case 'error':
        // Test error logging with email notification
        const testError = new Error('This is a test error from BidForge - Email notification test')
        testError.name = 'TestError'
        
        logError('Test error generated for email notification', testError, {
          testType: 'email_notification',
          endpoint: '/api/test-logger',
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
          severity: 'high'
        })
        break
        
      case 'warning':
        logWarning('Test warning message', {
          testType: 'warning',
          endpoint: '/api/test-logger',
          message: 'This is a test warning - no email sent'
        })
        break
        
      case 'database':
        // Simulate database error
        logError('Database connection failed', new Error('Connection timeout after 30s'), {
          testType: 'database_error',
          database: 'postgresql',
          connectionString: 'postgresql://***masked***',
          retryAttempt: 3,
          severity: 'critical'
        })
        break
        
      case 'auth':
        // Simulate authentication error
        logError('Authentication failed', new Error('Invalid JWT token'), {
          testType: 'auth_error',
          userId: 'user_123',
          endpoint: '/api/auth/login',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          severity: 'medium'
        })
        break
        
      default:
        logInfo('Unknown test type requested', { testType })
    }
    
    return NextResponse.json({
      success: true,
      message: `${testType} test logged successfully`,
      testType,
      timestamp: new Date().toISOString(),
      note: testType === 'error' || testType === 'database' || testType === 'auth' 
        ? 'Check your email for error notification' 
        : 'No email sent for this log level'
    })
    
  } catch (error) {
    logError('Failed to process logger test request', error)
    return NextResponse.json({
      success: false,
      error: 'Logger test request failed'
    }, { status: 500 })
  }
}