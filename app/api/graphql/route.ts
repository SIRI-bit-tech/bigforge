import { createYoga } from "graphql-yoga"
import { createSchema } from "graphql-yoga"
import { NextRequest } from "next/server"

// Create GraphQL schema
const schema = createSchema({
  typeDefs: `
    type Query {
      hello: String
    }
  `,
  resolvers: {
    Query: {
      hello: () => "Hello from BidForge GraphQL!"
    }
  }
})

// Simple GraphQL endpoint - schema will be added later
const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
})

// Wrap handlers to match Next.js App Router signature
export async function GET(request: NextRequest) {
  return handleRequest(request, {})
}

export async function POST(request: NextRequest) {
  return handleRequest(request, {})
}
