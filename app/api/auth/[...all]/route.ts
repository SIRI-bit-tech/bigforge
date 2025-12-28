import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

// Better Auth API route handler
export async function GET(request: NextRequest) {
  return auth.handler(request)
}

export async function POST(request: NextRequest) {
  return auth.handler(request)
}
