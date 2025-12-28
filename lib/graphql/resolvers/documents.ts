import { type GraphQLContext, requireAuth } from "../context"
import { documents } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { pubsub } from "../pubsub"

export const documentResolvers = {
  Query: {
    // Get documents for a project
    async documents(_: unknown, { projectId }: { projectId: string }, context: GraphQLContext) {
      requireAuth(context)

      const result = await context.db.query.documents.findMany({
        where: eq(documents.projectId, projectId),
        with: {
          uploadedBy: {
            with: {
              company: true,
            },
          },
        },
        orderBy: (documents, { desc }) => [desc(documents.uploadedAt)],
      })

      return result
    },
  },

  Mutation: {
    // Upload document
    async uploadDocument(
      _: unknown,
      { projectId, file, type }: { projectId: string; file: any; type: string },
      context: GraphQLContext,
    ) {
      const userId = requireAuth(context)

      // Verify project access
      const project = await context.loaders.project.load(projectId)
      if (!project) {
        throw new Error("Project not found")
      }

      // In production, upload to S3/R2 and get URL
      // For now, we'll simulate the upload
      const fileName = file.name || "document.pdf"
      const fileSize = file.size || 0
      const fileUrl = `https://storage.bidforge.com/projects/${projectId}/${Date.now()}-${fileName}`

      const [document] = await context.db
        .insert(documents)
        .values({
          projectId,
          name: fileName,
          type: type as "BLUEPRINT" | "SPECIFICATION" | "CONTRACT" | "ADDENDUM" | "PHOTO" | "OTHER",
          url: fileUrl,
          size: fileSize,
          uploadedById: userId,
        })
        .returning()

      // Publish subscription event
      await pubsub.publish("DOCUMENT_ADDED", {
        projectId,
        document,
      })

      return document
    },

    // Delete document
    async deleteDocument(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      // Verify ownership
      const document = await context.db.query.documents.findFirst({
        where: eq(documents.id, id),
        with: {
          project: true,
        },
      })

      if (!document || (document.project as any)?.createdById !== userId) {
        throw new Error("Document not found or access denied")
      }

      await context.db.delete(documents).where(eq(documents.id, id))

      // In production, also delete from S3/R2

      return true
    },
  },
}
