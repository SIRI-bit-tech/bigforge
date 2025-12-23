import { NextRequest, NextResponse } from 'next/server'
import { db, users, companies } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { verifyJWT } from '@/lib/services/auth'

export async function GET(request: NextRequest) {
  try {
    // 1) Authentication - read auth-token cookie and verify JWT
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      console.warn('Users fetch attempt without authentication token')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      console.warn('Users fetch attempt with invalid token')
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    // 3) Add pagination with safe defaults and enforced max cap
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25'))) // Default 25, max 100
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0')) // Default 0, min 0

    // Build the base query with selected fields (no sensitive data leakage)
    let baseQuery = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        companyId: users.companyId,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)

    // 2) Authorization - perform role-based access control
    if (payload.role === 'ADMIN') {
      // ADMIN role can query all users - no additional filtering needed
      console.log(`Admin ${payload.userId} accessing all users`)
    } else {
      // Non-admin users: restrict results to users.companyId === token.companyId
      if (!payload.companyId) {
        console.warn(`User ${payload.userId} attempted to access users without companyId`)
        return NextResponse.json(
          { error: 'Access denied. No company association found.' },
          { status: 403 }
        )
      }

      // Filter to only users in the same company
      baseQuery = baseQuery.where(eq(users.companyId, payload.companyId))
      console.log(`User ${payload.userId} accessing company ${payload.companyId} users`)
    }

    // 4) Apply role filter if specified (keeping existing functionality)
    if (role && ['CONTRACTOR', 'SUBCONTRACTOR'].includes(role)) {
      if (payload.role === 'ADMIN') {
        // Admin can filter by any role
        baseQuery = baseQuery.where(eq(users.role, role as 'CONTRACTOR' | 'SUBCONTRACTOR'))
      } else {
        // Non-admin: apply both company and role filters
        baseQuery = baseQuery.where(
          and(
            eq(users.companyId, payload.companyId!),
            eq(users.role, role as 'CONTRACTOR' | 'SUBCONTRACTOR')
          )
        )
      }
    }

    // Apply pagination
    const result = await baseQuery
      .limit(limit)
      .offset(offset)

    // Get total count for pagination metadata (with same authorization filters)
    let countQuery = db
      .select({ count: users.id })
      .from(users)

    if (payload.role !== 'ADMIN') {
      countQuery = countQuery.where(eq(users.companyId, payload.companyId!))
    }

    if (role && ['CONTRACTOR', 'SUBCONTRACTOR'].includes(role)) {
      if (payload.role === 'ADMIN') {
        countQuery = countQuery.where(eq(users.role, role as 'CONTRACTOR' | 'SUBCONTRACTOR'))
      } else {
        countQuery = countQuery.where(
          and(
            eq(users.companyId, payload.companyId!),
            eq(users.role, role as 'CONTRACTOR' | 'SUBCONTRACTOR')
          )
        )
      }
    }

    const [{ count: totalCount }] = await countQuery
    const totalPages = Math.ceil(totalCount / limit)

    // 5) Return response with proper HTTP status codes and pagination metadata
    return NextResponse.json({
      success: true,
      users: result,
      pagination: {
        limit,
        offset,
        total: totalCount,
        totalPages,
        hasNext: offset + limit < totalCount,
        hasPrev: offset > 0,
        currentPage: Math.floor(offset / limit) + 1
      }
    })

  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}