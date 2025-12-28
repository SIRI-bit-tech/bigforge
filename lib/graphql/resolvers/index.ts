import { authResolvers } from "./auth"
import { projectResolvers } from "./projects"
import { bidResolvers } from "./bids"
import { invitationResolvers } from "./invitations"
import { messageResolvers } from "./messages"
import { notificationResolvers } from "./notifications"
import { documentResolvers } from "./documents"
import { analyticsResolvers } from "./analytics"
import { subscriptionResolvers } from "./subscriptions"
import { companyResolvers } from "./companies"
import { tradeResolvers } from "./trades"
import { GraphQLScalarType, Kind } from "graphql"

// GraphQL Upload scalar (simplified version)
const GraphQLUpload = new GraphQLScalarType({
  name: 'Upload',
  description: 'The `Upload` scalar type represents a file upload.',
  serialize: () => {
    throw new Error('Upload serialization unsupported.')
  },
  parseValue: (value: any) => value,
  parseLiteral: () => {
    throw new Error('Upload literal unsupported.')
  },
})

// Custom scalar for DateTime
const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "DateTime custom scalar type",
  serialize(value: any) {
    return value instanceof Date ? value.toISOString() : value
  },
  parseValue(value: any) {
    return new Date(value)
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value)
    }
    return null
  },
})

// Custom scalar for Money (stored as string to preserve precision)
const MoneyScalar = new GraphQLScalarType({
  name: "Money",
  description: "Money custom scalar type",
  serialize(value: any) {
    return value ? String(value) : null
  },
  parseValue(value: any) {
    return String(value)
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
      return String(ast.value)
    }
    return null
  },
})

// Merge all resolvers
export const resolvers = {
  DateTime: DateTimeScalar,
  Money: MoneyScalar,
  Upload: GraphQLUpload,

  Query: {
    ...authResolvers.Query,
    ...projectResolvers.Query,
    ...bidResolvers.Query,
    ...invitationResolvers.Query,
    ...messageResolvers.Query,
    ...notificationResolvers.Query,
    ...documentResolvers.Query,
    ...analyticsResolvers.Query,
    ...companyResolvers.Query,
    ...tradeResolvers.Query,
  },

  Mutation: {
    ...authResolvers.Mutation,
    ...projectResolvers.Mutation,
    ...bidResolvers.Mutation,
    ...invitationResolvers.Mutation,
    ...messageResolvers.Mutation,
    ...notificationResolvers.Mutation,
    ...documentResolvers.Mutation,
    ...companyResolvers.Mutation,
  },

  Subscription: {
    ...subscriptionResolvers.Subscription,
  },

  Project: {
    ...projectResolvers.Project,
  },
}
