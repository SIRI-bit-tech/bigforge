// Client-side error logging that sends errors to API endpoint
// This avoids importing Node.js modules in client components

export const logClientError = async (message: string, error?: Error | any, metadata?: any) => {
  try {
    const errorData = {
      message,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      level: 'error',
      ...metadata
    }

    // Send error to API endpoint for server-side logging
    await fetch('/api/error-handler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'client_error',
        data: errorData
      })
    })
  } catch (logError) {
    // If logging fails, at least log to console
    console.error('Failed to log error to server:', logError)
    console.error('Original error:', message, error)
  }
}

export const logClientWarning = async (message: string, metadata?: any) => {
  try {
    await fetch('/api/error-handler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'client_warning',
        data: {
          message,
          level: 'warn',
          timestamp: new Date().toISOString(),
          ...metadata
        }
      })
    })
  } catch (error) {
    console.warn('Failed to log warning to server:', error)
    console.warn('Original warning:', message)
  }
}

export const logClientInfo = async (message: string, metadata?: any) => {
  try {
    await fetch('/api/error-handler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'client_info',
        data: {
          message,
          level: 'info',
          timestamp: new Date().toISOString(),
          ...metadata
        }
      })
    })
  } catch (error) {
    console.info('Failed to log info to server:', error)
    console.info('Original info:', message)
  }
}