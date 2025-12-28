import { createPubSub } from "graphql-yoga"

// Create PubSub instance for real-time subscriptions
export const pubsub = createPubSub()
