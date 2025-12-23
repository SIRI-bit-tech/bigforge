import { NextRequest, NextResponse } from 'next/server'
import { db, bids, projects } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { verifyJWT } from '@/lib/services/auth'

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      console.warn('Bid submission attempt without authentication token')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      console.warn('Bid submission attempt with invalid token')
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Only subcontractors can submit bids
    if (payload.role !== 'SUBCONTRACTOR') {
      console.warn(`User ${payload.userId} with role ${payload.role} attempted to submit bid`)
      return NextResponse.json(
        { error: 'Only subcontractors can submit bids' },
        { status: 403 }
      )
    }

    const { projectId, totalAmount, notes } = await request.json()

    // Validate input
    if (!projectId || !totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Project ID and valid total amount are required' },
        { status: 400 }
      )
    }

    // Verify project exists and is published
    const [project] = await db
      .select({
        id: projects.id,
        status: projects.status,
        deadline: projects.deadline,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (project.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Can only bid on published projects' },
        { status: 400 }
      )
    }

    // Check if deadline has passed
    if (new Date() > new Date(project.deadline)) {
      return NextResponse.json(
        { error: 'Bidding deadline has passed' },
        { status: 400 }
      )
    }

    // Check if user has already submitted a bid for this project
    const [existingBid] = await db
      .select({ id: bids.id })
      .from(bids)
      .where(
        and(
          eq(bids.projectId, projectId),
          eq(bids.subcontractorId, payload.userId)
        )
      )
      .limit(1)

    if (existingBid) {
      return NextResponse.json(
        { error: 'You have already submitted a bid for this project' },
        { status: 400 }
      )
    }

    // Create the bid
    const [newBid] = await db
      .insert(bids)
      .values({
        projectId,
        subcontractorId: payload.userId,
        totalAmount: totalAmount.toString(),
        status: 'SUBMITTED',
        notes: notes || null,
        submittedAt: new Date(),
      })
      .returning()

    console.log(`Bid submitted successfully: ${newBid.id} by user ${payload.userId} for project ${projectId}`)

    return NextResponse.json({
      success: true,
      bid: newBid,
      message: 'Bid submitted successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to submit bid:', error)
    return NextResponse.json(
      { error: 'Failed to submit bid' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const subcontractorId = searchParams.get('subcontractorId')

    let whereConditions = []

    // Authorization based on role
    if (payload.role === 'CONTRACTOR') {
      // Contractors can view bids for their own projects
      if (projectId) {
        // Verify the contractor owns this project
        const [project] = await db
          .select({ createdById: projects.createdById })
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1)

        if (!project || project.createdById !== payload.userId) {
          return NextResponse.json(
            { error: 'Access denied. You can only view bids for your own projects.' },
            { status: 403 }
          )
        }
        whereConditions.push(eq(bids.projectId, projectId))
      } else {
        // Get all bids for contractor's projects
        const userProjects = await db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.createdById, payload.userId))

        if (userProjects.length === 0) {
          return NextResponse.json({
            success: true,
            bids: []
          })
        }

        // For now, return empty if no specific project is requested
        // TODO: Implement IN clause for multiple projects
        return NextResponse.json({
          success: true,
          bids: []
        })
      }
    } else if (payload.role === 'SUBCONTRACTOR') {
      // Subcontractors can only view their own bids
      whereConditions.push(eq(bids.subcontractorId, payload.userId))
      
      if (projectId) {
        whereConditions.push(eq(bids.projectId, projectId))
      }
    } else {
      return NextResponse.json(
        { error: 'Access denied. Invalid user role.' },
        { status: 403 }
      )
    }

    const result = whereConditions.length > 0 
      ? await db.select().from(bids).where(and(...whereConditions))
      : []

    return NextResponse.json({
      success: true,
      bids: result
    })

  } catch (error) {
    console.error('Failed to fetch bids:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bids' },
      { status: 500 }
    )
  }
}