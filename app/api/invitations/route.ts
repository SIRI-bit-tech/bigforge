import { NextRequest, NextResponse } from 'next/server'
import { db, invitations, projects, users } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { verifyJWT } from '@/lib/services/auth'

export async function POST(request: NextRequest) {
  try {
    // Authentication check - verify caller is authenticated
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      console.warn('Invitation creation attempt without authentication token')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      console.warn('Invitation creation attempt with invalid token')
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { projectId, subcontractorIds, message } = await request.json()

    // Validate input
    if (!projectId || !subcontractorIds || !Array.isArray(subcontractorIds)) {
      return NextResponse.json(
        { error: 'Project ID and subcontractor IDs are required' },
        { status: 400 }
      )
    }

    // Authorization check - verify caller is authorized to invite subcontractors to the project
    // (i.e., is the project owner)
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if the authenticated user is the project owner
    if (project.createdById !== payload.userId) {
      console.warn(`User ${payload.userId} attempted unauthorized invitation creation for project ${projectId} (owner: ${project.createdById})`)
      return NextResponse.json(
        { error: 'Access denied. Only project owners can send invitations.' },
        { status: 403 }
      )
    }

    if (project.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Can only invite to published projects' },
        { status: 400 }
      )
    }

    // Verify that all provided IDs are valid subcontractors
    const validSubcontractors = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.role, 'SUBCONTRACTOR'),
          // Check if user ID is in the provided list
          // Note: This is a simplified check - in production you might want to use an IN clause
        )
      )

    // Filter to only include valid subcontractor IDs that exist in the database
    const validSubcontractorIds = subcontractorIds.filter(id => 
      validSubcontractors.some(sub => sub.id === id)
    )

    if (validSubcontractorIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid subcontractors found' },
        { status: 400 }
      )
    }

    // Check for existing invitations to avoid duplicates
    const existingInvitations = await db
      .select()
      .from(invitations)
      .where(eq(invitations.projectId, projectId))

    const existingSubcontractorIds = existingInvitations.map(inv => inv.subcontractorId)
    const newSubcontractorIds = validSubcontractorIds.filter(
      id => !existingSubcontractorIds.includes(id)
    )

    if (newSubcontractorIds.length === 0) {
      return NextResponse.json(
        { error: 'All selected subcontractors have already been invited' },
        { status: 400 }
      )
    }

    // Create invitations
    const newInvitations = await db
      .insert(invitations)
      .values(
        newSubcontractorIds.map(subcontractorId => ({
          projectId,
          subcontractorId,
          status: 'PENDING' as const,
        }))
      )
      .returning()

    console.log(`User ${payload.userId} successfully sent ${newInvitations.length} invitation(s) for project ${projectId}`)

    // TODO: Send email notifications to subcontractors
    // This would integrate with your email service
    
    return NextResponse.json({
      success: true,
      invitations: newInvitations,
      message: `Successfully sent ${newInvitations.length} invitation${newInvitations.length !== 1 ? 's' : ''}`
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to send invitations:', error)
    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check for GET endpoint as well
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
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')

    let whereConditions = []

    // Authorization: Users can only view invitations they're involved with
    if (payload.role === 'CONTRACTOR') {
      // Contractors can view invitations for their own projects
      if (projectId) {
        // Verify the contractor owns this project
        const [project] = await db
          .select({ createdById: projects.createdById })
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1)

        if (!project || project.createdById !== payload.userId) {
          return NextResponse.json(
            { error: 'Access denied. You can only view invitations for your own projects.' },
            { status: 403 }
          )
        }
        whereConditions.push(eq(invitations.projectId, projectId))
      } else {
        // If no specific project, show invitations for all their projects
        const userProjects = await db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.createdById, payload.userId))

        if (userProjects.length === 0) {
          return NextResponse.json({
            success: true,
            invitations: []
          })
        }

        // This would need to be implemented with an IN clause for multiple projects
        // For now, we'll return empty if no specific project is requested
        return NextResponse.json({
          success: true,
          invitations: []
        })
      }
    } else if (payload.role === 'SUBCONTRACTOR') {
      // Subcontractors can only view their own invitations
      whereConditions.push(eq(invitations.subcontractorId, payload.userId))
      
      if (projectId) {
        whereConditions.push(eq(invitations.projectId, projectId))
      }
    } else {
      return NextResponse.json(
        { error: 'Access denied. Invalid user role.' },
        { status: 403 }
      )
    }

    const result = whereConditions.length > 0 
      ? await db.select().from(invitations).where(and(...whereConditions))
      : []

    return NextResponse.json({
      success: true,
      invitations: result
    })

  } catch (error) {
    console.error('Failed to fetch invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}