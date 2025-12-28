import { pubsub } from "../pubsub"
import { requireAuth, type GraphQLContext } from "../context"

export const subscriptionResolvers = {
  Subscription: {
    // Real-time bid submission notifications
    bidSubmitted: {
      subscribe: (_: unknown, { projectId }: { projectId: string }, context: GraphQLContext) => {
        requireAuth(context)
        return pubsub.subscribe("BID_SUBMITTED")
      },
      resolve: (payload: any, { projectId }: { projectId: string }) => payload.projectId === projectId ? payload.bid : null,
    },

    // Bid update notifications
    bidUpdated: {
      subscribe: (_: unknown, { bidId }: { bidId: string }, context: GraphQLContext) => {
        requireAuth(context)
        return pubsub.subscribe("BID_UPDATED")
      },
      resolve: (payload: any, { bidId }: { bidId: string }) => payload.bidId === bidId ? payload.bid : null,
    },

    // Project update notifications
    projectUpdated: {
      subscribe: (_: unknown, { projectId }: { projectId: string }, context: GraphQLContext) => {
        requireAuth(context)
        return pubsub.subscribe("PROJECT_UPDATED")
      },
      resolve: (payload: any, { projectId }: { projectId: string }) => payload.projectId === projectId ? payload.project : null,
    },

    // Invitation received notifications
    invitationReceived: {
      subscribe: (_: unknown, __: unknown, context: GraphQLContext) => {
        requireAuth(context)
        return pubsub.subscribe("INVITATION_RECEIVED")
      },
      resolve: (payload: any, __: unknown, context: GraphQLContext) => {
        const userId = context.userId
        return payload.subcontractorId === userId ? payload.invitation : null
      },
    },

    // Message notifications
    messageAdded: {
      subscribe: (
        _: unknown,
        { bidId, projectId }: { bidId?: string; projectId?: string },
        context: GraphQLContext,
      ) => {
        requireAuth(context)
        return pubsub.subscribe("MESSAGE_ADDED")
      },
      resolve: (payload: any, { bidId, projectId }: { bidId?: string; projectId?: string }, context: GraphQLContext) => {
        const userId = context.userId
        const matchesBid = bidId ? payload.bidId === bidId : true
        const matchesProject = projectId ? payload.projectId === projectId : true
        const isRecipient = payload.receiverId === userId
        return matchesBid && matchesProject && isRecipient ? payload.message : null
      },
    },

    // Notification notifications
    notificationReceived: {
      subscribe: (_: unknown, __: unknown, context: GraphQLContext) => {
        requireAuth(context)
        return pubsub.subscribe("NOTIFICATION_RECEIVED")
      },
      resolve: (payload: any, __: unknown, context: GraphQLContext) => {
        const userId = context.userId
        return payload.userId === userId ? payload.notification : null
      },
    },
  },
}
