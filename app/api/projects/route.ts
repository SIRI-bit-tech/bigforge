import { NextRequest, NextResponse } from 'next/server'
import { db, projects, projectTrades, trades } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { verifyJWT } from '@/lib/services/auth'
import { handleAPIError } from '@/app/api/error-handler/route'

export async function GET(request: NextRequest) {
  let payload: any // Hoist payload declaration to make it accessible in catch block
  
  try {
    // Authentication check
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      // Projects fetch attempt without authentication token
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    payload = verifyJWT(token)
    if (!payload) {
      // Projects fetch attempt with invalid token
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    // Note: createdBy query parameter is ignored for security - users can only see projects they have access to

    // Get projects with their trades
    const projectsWithTrades = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        location: projects.location,
        city: projects.city,
        state: projects.state,
        budgetMin: projects.budgetMin,
        budgetMax: projects.budgetMax,
        startDate: projects.startDate,
        endDate: projects.endDate,
        deadline: projects.deadline,
        status: projects.status,
        createdById: projects.createdById,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        tradeName: trades.name,
      })
      .from(projects)
      .leftJoin(projectTrades, eq(projects.id, projectTrades.projectId))
      .leftJoin(trades, eq(projectTrades.tradeId, trades.id))

    // Apply authorization-based filtering
    let filteredProjects = projectsWithTrades

    // Users can see:
    // 1. Projects they created (if they're contractors)
    // 2. Published projects (if they're subcontractors looking for opportunities)
    if (payload.role === 'CONTRACTOR') {
      // Contractors can see their own projects (all statuses)
      filteredProjects = filteredProjects.filter(p => p.createdById === payload.userId)
    } else if (payload.role === 'SUBCONTRACTOR') {
      // Subcontractors can only see published projects (opportunities)
      filteredProjects = filteredProjects.filter(p => p.status === 'PUBLISHED')
    } else {
      // Unknown role - deny access
      return NextResponse.json(
        { error: 'Access denied. Invalid user role.' },
        { status: 403 }
      )
    }

    // Apply additional status filter if specified
    if (status && ['DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED'].includes(status)) {
      filteredProjects = filteredProjects.filter(p => p.status === status)
    }

    // Group trades by project
    const projectsMap = new Map()
    
    filteredProjects.forEach(row => {
      if (!projectsMap.has(row.id)) {
        projectsMap.set(row.id, {
          id: row.id,
          title: row.title,
          description: row.description,
          location: row.location,
          city: row.city,
          state: row.state,
          budgetMin: row.budgetMin,
          budgetMax: row.budgetMax,
          startDate: row.startDate,
          endDate: row.endDate,
          deadline: row.deadline,
          status: row.status,
          createdBy: row.createdById, // Map createdById to createdBy for compatibility
          createdById: row.createdById,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          trades: [],
        })
      }
      
      if (row.tradeName) {
        const project = projectsMap.get(row.id)
        if (!project.trades.includes(row.tradeName)) {
          project.trades.push(row.tradeName)
        }
      }
    })

    const result = Array.from(projectsMap.values())

    // User fetched projects

    return NextResponse.json({
      success: true,
      projects: result
    })

  } catch (error) {
    return handleAPIError(error as Error, request, {
      method: 'GET',
      userId: payload?.userId || 'unknown',
      userRole: payload?.role || 'unknown',
      errorType: 'projects_fetch_error',
      severity: 'medium'
    })
  }
}

export async function POST(request: NextRequest) {
  let payload: any // Hoist payload declaration to make it accessible in catch block
  
  try {
    // Authentication check
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      // Project creation attempt without authentication token
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    payload = verifyJWT(token)
    if (!payload) {
      // Project creation attempt with invalid token
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Only contractors can create projects
    if (payload.role !== 'CONTRACTOR') {
      // User with non-contractor role attempted to create project
      return NextResponse.json(
        { error: 'Access denied. Only contractors can create projects.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, location, budgetMin, budgetMax, startDate, endDate, deadline, status } = body
    // Note: createdById is ignored from request body - we use authenticated user's ID

    // Validate required fields (removed createdById since we derive it from auth)
    if (!title || !description || !location || !deadline) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, location, deadline' },
        { status: 400 }
      )
    }

    // Use authenticated user's ID as createdById
    const authenticatedUserId = payload.userId

    const [project] = await db
      .insert(projects)
      .values({
        title,
        description,
        location,
        budgetMin: budgetMin || null,
        budgetMax: budgetMax || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        deadline: new Date(deadline),
        createdById: authenticatedUserId, // Use authenticated user's ID
        status: status || 'DRAFT',
      })
      .returning()

    // User created project

    return NextResponse.json({
      success: true,
      project
    }, { status: 201 })

  } catch (error) {
    return handleAPIError(error as Error, request, {
      method: 'POST',
      userId: payload?.userId || 'unknown',
      userRole: payload?.role || 'unknown',
      errorType: 'project_creation_error',
      severity: 'high'
    })
  }
}