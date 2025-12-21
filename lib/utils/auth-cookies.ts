import { NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/utils/jwt'

export interface AuthUser {
  userId: string
  role: string
  companyId?: string
}

/**
 * Extract and verify JWT token from httpOnly cookie
 */
export async function getAuthUserFromCookie(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return null
    }

    const payload = await verifyJWT(token)
    
    if (!payload || !payload.userId || !payload.role) {
      return null
    }

    return {
      userId: payload.userId,
      role: payload.role,
      companyId: payload.companyId
    }
  } catch (error) {
    console.error('Error extracting auth user from cookie:', error)
    return null
  }
}

/**
 * Check if user is authenticated from cookie
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const user = await getAuthUserFromCookie(request)
  return user !== null
}

/**
 * Check if user has specific role
 */
export async function hasRole(request: NextRequest, requiredRole: string): Promise<boolean> {
  const user = await getAuthUserFromCookie(request)
  return user?.role === requiredRole
}