import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { db, documents, projects, bids } from '@/lib/db'
import { eq, desc, and } from 'drizzle-orm'
import { verifyJWT } from '@/lib/services/auth'

export async function POST(request: NextRequest) {
  try {
    // 1. Extract and verify authenticated user
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      // Document upload attempt without authentication token
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      // Document upload attempt with invalid token
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { projectId, name, type, url, size } = await request.json()

    // 4. Adjust input validation - no longer require uploadedBy from client
    if (!projectId || !name || !type || !url) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, name, type, url' },
        { status: 400 }
      )
    }

    // 2. Validate user has access to the project
    // Check if user is project owner OR has submitted a bid to the project
    const [projectAccess] = await db
      .select({
        projectId: projects.id,
        createdById: projects.createdById,
        bidId: bids.id,
      })
      .from(projects)
      .leftJoin(bids, eq(bids.projectId, projects.id))
      .where(
        eq(projects.id, projectId)
      )
      .limit(1)

    if (!projectAccess) {
      // User attempted to upload document to non-existent project
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if user has access (is owner OR has submitted a bid)
    const isOwner = projectAccess.createdById === payload.userId
    
    let hasAccess = isOwner
    
    if (!hasAccess) {
      // Check if user has submitted a bid to this project
      const [bidAccess] = await db
        .select({ id: bids.id })
        .from(bids)
        .where(
          and(
            eq(bids.projectId, projectId),
            eq(bids.subcontractorId, payload.userId)
          )
        )
        .limit(1)
      
      hasAccess = !!bidAccess
    }

    if (!hasAccess) {
      // User attempted unauthorized document upload to project
      return NextResponse.json(
        { error: 'Access denied. You must be the project owner or have submitted a bid to upload documents.' },
        { status: 403 }
      )
    }

    // 3. Use authenticated user's ID as uploadedById (drop uploadedBy from payload)
    const [newDocument] = await db
      .insert(documents)
      .values({
        projectId,
        name,
        type,
        url,
        size: size || 0,
        uploadedById: payload.userId, // Use authenticated user's ID
        version: 1,
      })
      .returning()

    // Document uploaded successfully

    return NextResponse.json({ document: newDocument }, { status: 201 })
  } catch (error) {
    logError('documents endpoint error', error, {
      endpoint: '/api/documents',
      errorType: 'documents_error',
      severity: 'high'
    })
    
    return NextResponse.json(
      { error: 'Failed to save document'  },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Retrieve current user/session at the top of the handler
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to the requested project
    // Check if project belongs to or is shared with the user
    const [projectAccess] = await db
      .select({
        projectId: projects.id,
        createdById: projects.createdById,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!projectAccess) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if user is project owner OR has submitted a bid (project access)
    const isOwner = projectAccess.createdById === payload.userId
    
    let hasAccess = isOwner
    
    if (!hasAccess) {
      // Check if user has submitted a bid to this project
      const [bidAccess] = await db
        .select({ id: bids.id })
        .from(bids)
        .where(
          and(
            eq(bids.projectId, projectId),
            eq(bids.subcontractorId, payload.userId)
          )
        )
        .limit(1)
      
      hasAccess = !!bidAccess
    }

    if (!hasAccess) {
      // User attempted unauthorized document access to project
      return NextResponse.json(
        { error: 'Access denied. You must be the project owner or have submitted a bid to access documents.' },
        { status: 403 }
      )
    }

    // Only proceed to fetch and return documents when access check passes
    const projectDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.uploadedAt))

    return NextResponse.json({ documents: projectDocuments })
  } catch (error) {
    logError('documents endpoint error', error, {
      endpoint: '/api/documents',
      errorType: 'documents_error',
      severity: 'high'
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch documents'  },
      { status: 500 }
    )
  }
}