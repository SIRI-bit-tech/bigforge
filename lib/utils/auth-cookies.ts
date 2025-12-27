import { NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/services/auth'

export interface AuthUser {
  userId: string
  role: string
  companyId?: string
}

/**
 * Extract and verify JWT token from httpOnly cookie
 */
export function getAuthUserFromCookie(request: NextRequest): AuthUser | null {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return null
    }

    const payload = verifyJWT(token)
    
    if (!payload || !payload.userId || !payload.role) {
      return null
    }

    return {
      userId: payload.userId,
      role: payload.role,
      companyId: payload.companyId
    }
  } catch (error) {
    // Error extracting auth user from cookie
    return null
  }
}

/**
 * Check if user is authenticated from cookie
 */
export function isAuthenticated(request: NextRequest): boolean {
  const user = getAuthUserFromCookie(request)
  return user !== null
}

/**
 * Check if user has specific role
 */
export function hasRole(request: NextRequest, requiredRole: string): boolean {
  const user = getAuthUserFromCookie(request)
  return user?.role === requiredRole
}