import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/lib/db'
import { eq, and, count } from 'drizzle-orm'
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
    const baseQueryBuilder = db
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

    // Build where conditions based on authorization and filters
    const mainWhereConditions = []

    // 2) Authorization - perform role-based access control
    if (payload.role === 'ADMIN') {
      // ADMIN role can query all users - no additional filtering needed
      console.log(`Admin ${payload.userId} accessing all users`)
    } else if (payload.role === 'CONTRACTOR') {
      // CONTRACTORS can view:
      // - All SUBCONTRACTORS (for inviting to projects)
      // - Users from their own company (if they have one)
      if (role === 'SUBCONTRACTOR') {
        // Allow contractors to see all subcontractors for project invitations
        console.log(`Contractor ${payload.userId} accessing all subcontractors`)
      } else if (payload.companyId) {
        // If querying other roles, restrict to same company
        mainWhereConditions.push(eq(users.companyId, payload.companyId))
        console.log(`Contractor ${payload.userId} accessing company ${payload.companyId} users`)
      } else {
        // Contractor without company can only see subcontractors
        if (!role || role !== 'SUBCONTRACTOR') {
          console.warn(`Contractor ${payload.userId} without company attempted to access non-subcontractor users`)
          return NextResponse.json(
            { error: 'Access denied. Contractors can view subcontractors or users from their company.' },
            { status: 403 }
          )
        }
      }
    } else if (payload.role === 'SUBCONTRACTOR') {
      // SUBCONTRACTORS can view:
      // - Users from their own company (if they have one)
      // - Other subcontractors (for networking)
      // - Contractors (for messaging)
      if (role === 'SUBCONTRACTOR') {
        // Allow subcontractors to see other subcontractors
        console.log(`Subcontractor ${payload.userId} accessing all subcontractors`)
      } else if (role === 'CONTRACTOR') {
        // Allow subcontractors to see contractors for messaging
        console.log(`Subcontractor ${payload.userId} accessing all contractors`)
      } else if (payload.companyId) {
        // If querying other roles, restrict to same company
        mainWhereConditions.push(eq(users.companyId, payload.companyId))
        console.log(`Subcontractor ${payload.userId} accessing company ${payload.companyId} users`)
      } else {
        // Subcontractor without company can see subcontractors and contractors
        if (!role || !['SUBCONTRACTOR', 'CONTRACTOR'].includes(role)) {
          console.warn(`Subcontractor ${payload.userId} without company attempted to access non-subcontractor/contractor users`)
          return NextResponse.json(
            { error: 'Access denied. Subcontractors can view other subcontractors, contractors, or users from their company.' },
            { status: 403 }
          )
        }
      }
    } else {
      // Unknown role
      console.warn(`User ${payload.userId} with unknown role ${payload.role} attempted to access users`)
      return NextResponse.json(
        { error: 'Access denied. Invalid user role.' },
        { status: 403 }
      )
    }

    // 4) Apply role filter if specified (keeping existing functionality)
    if (role && ['CONTRACTOR', 'SUBCONTRACTOR'].includes(role)) {
      mainWhereConditions.push(eq(users.role, role as 'CONTRACTOR' | 'SUBCONTRACTOR'))
    }

    // Apply pagination
    const result = mainWhereConditions.length > 0 
      ? await baseQueryBuilder.where(and(...mainWhereConditions)).limit(limit).offset(offset)
      : await baseQueryBuilder.limit(limit).offset(offset)

    // Get total count for pagination metadata (with same authorization filters)
    let countQueryBuilder = db
      .select({ count: count() })
      .from(users)

    // Apply the same filters as the main query
    const countWhereConditions = []
    
    if (payload.role === 'ADMIN') {
      // Admin can count all users
    } else if (payload.role === 'CONTRACTOR') {
      if (role === 'SUBCONTRACTOR') {
        // Contractors can count all subcontractors
      } else if (payload.companyId) {
        countWhereConditions.push(eq(users.companyId, payload.companyId))
      }
    } else if (payload.role === 'SUBCONTRACTOR') {
      if (role === 'SUBCONTRACTOR') {
        // Subcontractors can count all subcontractors
      } else if (role === 'CONTRACTOR') {
        // Subcontractors can count all contractors
      } else if (payload.companyId) {
        countWhereConditions.push(eq(users.companyId, payload.companyId))
      }
    }

    if (role && ['CONTRACTOR', 'SUBCONTRACTOR'].includes(role)) {
      countWhereConditions.push(eq(users.role, role as 'CONTRACTOR' | 'SUBCONTRACTOR'))
    }

    const countResult = countWhereConditions.length > 0 
      ? await countQueryBuilder.where(and(...countWhereConditions))
      : await countQueryBuilder

    const totalCount = Number(countResult[0].count)
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