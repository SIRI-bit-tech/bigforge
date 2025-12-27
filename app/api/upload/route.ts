import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage/cloudinary"
import { verifyJWT } from "@/lib/services/auth"

// File upload API route for blueprints and documents
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = await verifyJWT(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const folder = (formData.get("folder") as string) || "documents"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 50MB limit" }, { status: 400 })
    }

    // Upload to Cloudinary
    const { url, publicId } = await storage.uploadFile(file, folder)

    return NextResponse.json({
      success: true,
      file: {
        key: publicId,
        url,
        name: file.name,
        size: file.size,
        type: file.type,
      },
    })
  } catch (error) {
    logError('upload endpoint error', error, {
      endpoint: '/api/upload',
      errorType: 'upload_error',
      severity: 'high'
    })
    
    return NextResponse.json(
      { error: "Upload failed"  },
      { status: 500 }
    )
  }
}
