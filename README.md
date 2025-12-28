# BidForge - Construction Bid Management Platform

A comprehensive B2B platform connecting general contractors with qualified subcontractors. Streamline RFPs, compare bids in real-time, and award contracts with confidence.

## Overview

BidForge is a production-ready construction bid management platform built with modern web technologies. It provides a complete solution for managing construction projects, inviting subcontractors, receiving and comparing bids, and awarding contracts.

## Features

### For General Contractors
- **Project Management**: Create and publish construction projects with detailed RFPs
- **Bid Comparison**: Review and compare bids side-by-side with intelligent filtering
- **Subcontractor Discovery**: Search and invite qualified subcontractors by trade
- **Real-time Updates**: Get instant notifications when bids are submitted
- **Document Management**: Upload blueprints, specifications, and project documents
- **Analytics Dashboard**: Track project performance and bid statistics

### For Subcontractors
- **Project Opportunities**: Browse available projects matching your trades
- **Bid Submission**: Submit detailed bids with line items and alternates
- **Invitation Management**: Respond to direct project invitations
- **Bid Tracking**: Monitor status of all submitted bids in one place
- **Messaging**: Communicate directly with general contractors
- **Performance Insights**: View win rates and bidding analytics

### Platform Features
- **Real-time Subscriptions**: WebSocket-based updates using GraphQL subscriptions
- **File Storage**: Cloudinary integration for blueprints and documents
- **Email Notifications**: Automated alerts for bids, awards, and deadlines
- **Authentication**: Secure JWT-based auth with role-based access control
- **Mobile Responsive**: Optimized for on-site access from any device

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19.2
- **Styling**: Tailwind CSS v4 with custom design tokens
- **Components**: shadcn/ui with Radix UI primitives
- **State Management**: URQL for GraphQL + local UI state
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

### Backend
- **API**: GraphQL with GraphQL Yoga
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Type-safe database schema with relations
- **Authentication**: Better Auth with JWT tokens
- **Caching**: Redis for data caching with IORedis
- **File Storage**: Cloudinary for document/image uploads
- **Email**: SendGrid for transactional emails

### GraphQL Architecture
- **Client**: URQL with normalized caching (GraphCache)
- **Real-time**: WebSocket subscriptions via graphql-ws
- **Optimization**: DataLoader for N+1 query prevention
- **Pub/Sub**: Event-driven notifications and updates
- **Code Generation**: GraphQL Code Generator for TypeScript types

## Project Structure

```
bidforge/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Authenticated dashboard routes
│   │   ├── dashboard/           # Main dashboard page
│   │   ├── projects/            # Project management
│   │   ├── opportunities/       # Browse projects (subcontractors)
│   │   ├── my-bids/            # Bid tracking
│   │   ├── invitations/         # Invitation management
│   │   ├── subcontractors/      # Subcontractor directory
│   │   ├── messages/            # Messaging system
│   │   ├── notifications/       # Notification center
│   │   ├── analytics/           # Performance analytics
│   │   └── settings/            # User/company settings
│   ├── api/                     # API routes
│   │   ├── graphql/            # GraphQL API endpoint
│   │   ├── auth/               # Better Auth routes
│   │   └── upload/             # File upload endpoint
│   ├── login/                   # Authentication pages
│   ├── register/
│   ├── onboarding/
│   └── page.tsx                 # Landing page
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── project-card.tsx         # Reusable project card
│   ├── bid-card.tsx            # Reusable bid card
│   ├── stats-card.tsx          # Dashboard statistics
│   ├── navbar.tsx              # Navigation header
│   ├── sidebar.tsx             # Dashboard sidebar
│   └── ...
├── lib/                         # Core library code
│   ├── db/                      # Database layer
│   │   ├── schema.ts           # Drizzle ORM schema
│   │   └── index.ts            # Database client
│   ├── graphql/                 # GraphQL layer
│   │   ├── schema.ts           # GraphQL schema definition
│   │   ├── context.ts          # Request context with loaders
│   │   ├── loaders.ts          # DataLoader implementations
│   │   ├── pubsub.ts           # Pub/Sub for subscriptions
│   │   ├── client.ts           # URQL client configuration
│   │   ├── cache-config.ts     # GraphCache configuration
│   │   ├── resolvers/          # GraphQL resolvers
│   │   │   ├── auth.ts         # Authentication
│   │   │   ├── projects.ts     # Projects CRUD
│   │   │   ├── bids.ts         # Bids management
│   │   │   ├── invitations.ts  # Invitation handling
│   │   │   ├── messages.ts     # Messaging
│   │   │   ├── notifications.ts # Notifications
│   │   │   ├── documents.ts    # Document management
│   │   │   ├── companies.ts    # Company profiles
│   │   │   ├── subcontractors.ts # Subcontractor directory
│   │   │   ├── trades.ts       # Trade categories
│   │   │   ├── analytics.ts    # Performance analytics
│   │   │   ├── subscriptions.ts # Real-time subscriptions
│   │   │   └── index.ts        # Combined resolvers
│   │   └── queries/            # Client-side GraphQL queries
│   │       ├── projects.ts     # Project queries/mutations
│   │       ├── bids.ts         # Bid operations
│   │       ├── auth.ts         # Auth operations
│   │       ├── invitations.ts  # Invitation operations
│   │       ├── messages.ts     # Message queries
│   │       ├── notifications.ts # Notification queries
│   │       ├── documents.ts    # Document operations
│   │       └── companies.ts    # Company queries
│   ├── auth/                    # Authentication
│   │   └── index.ts            # Better Auth configuration
│   ├── cache/                   # Caching layer
│   │   └── redis.ts            # Redis client and helpers
│   ├── storage/                 # File storage
│   │   └── cloudinary.ts       # Cloudinary integration
│   ├── utils/                   # Utility functions
│   │   ├── email.ts            # Email templates and sender
│   │   ├── jwt.ts              # JWT utilities
│   │   ├── format.ts           # Formatting helpers
│   │   └── ...
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-auth.ts         # Authentication hook
│   │   └── use-mobile.tsx      # Mobile detection
│   ├── providers/               # React providers
│   │   └── urql-provider.tsx   # URQL GraphQL provider
│   └── types.ts                # TypeScript type definitions
├── scripts/                     # Database scripts
│   └── 001-init-database.sql   # Initial schema setup
├── drizzle.config.ts           # Drizzle ORM configuration
├── codegen.yml                 # GraphQL code generation config
└── package.json

```

## Getting Started

### Prerequisites
- Node.js 20+ 
- Bun package manager
- PostgreSQL database
- Redis server (optional, for caching)
- Cloudinary account (for file storage)
- SendGrid account (for emails)

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bidforge"

# Authentication
JWT_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_SECRET="your-auth-secret"
BETTER_AUTH_URL="http://localhost:3000"

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Redis (Optional - for caching)
REDIS_URL="redis://localhost:6379"

# SendGrid (Email Notifications)
SENDGRID_API_KEY="your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@bidforge.com"

# Gmail SMTP (Error Monitoring)
GMAIL_USER="your-gmail@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"
GMAIL_HOST="smtp.gmail.com"

# Logging & Monitoring Configuration
LOG_LEVEL="info"                    # Logging level: error, warn, info, debug
ENABLE_EMAIL_ALERTS="true"          # Enable email notifications for errors
NODE_ENV="production"               # Environment: development, production
ENABLE_RATE_LIMITING="true"         # Enable API rate limiting
ENABLE_SECURITY_HEADERS="true"      # Enable security headers
ENABLE_AUDIT_LOGGING="true"         # Enable audit logging

# Security Configuration
SHOW_PASSWORD_ERRORS="false"        # Show detailed password errors (dev only)
API_RATE_LIMIT_GENERAL="100"        # General API rate limit (requests/minute)
API_RATE_LIMIT_AUTH="10"            # Auth API rate limit (requests/minute)
API_RATE_LIMIT_UPLOAD="10"          # Upload API rate limit (requests/minute)

# GraphQL
NEXT_PUBLIC_GRAPHQL_URL="http://localhost:3000/api/graphql"
NEXT_PUBLIC_GRAPHQL_WS_URL="ws://localhost:3000/api/graphql"
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/SIRI-bit-tech/bigforge
cd bidforge
```

2. **Install dependencies**
```bash
bun install
```

3. **Set up the database**
```bash
# Push schema to database
bun run db:push

# Apply performance indexes for optimal query performance
psql $DATABASE_URL -f drizzle/performance-indexes-enhanced.sql

# (Optional) Run seed script if available
# bun run db:seed
```

4. **Generate GraphQL types (if codegen is set up)**
```bash
# bun run codegen
```

5. **Start development server**
```bash
bun dev
```

6. **Open your browser**
Navigate to `http://localhost:3000`

## Database Schema

### Core Tables
- **users**: User accounts (contractors & subcontractors)
- **companies**: Company profiles and information
- **projects**: Construction projects with RFPs
- **bids**: Subcontractor bid submissions
- **line_items**: Detailed cost breakdown for bids
- **alternates**: Alternative options in bids
- **invitations**: Project invitations to subcontractors
- **documents**: Uploaded files (blueprints, specs)
- **messages**: Communication between users
- **notifications**: System notifications
- **trades**: Trade categories and specializations

### Relations
- Users belong to Companies (one-to-many)
- Projects have many Bids (one-to-many)
- Bids have many Line Items and Alternates (one-to-many)
- Projects have many Invitations and Documents (one-to-many)
- Messages link Users to Projects (many-to-many)

## GraphQL API

### Queries
- `me`: Current authenticated user
- `projects(filter, limit, offset)`: List projects
- `project(id)`: Single project details
- `bids(projectId, subcontractorId, status)`: List bids
- `bid(id)`: Single bid details
- `invitations(...)`: List invitations
- `messages(projectId)`: Project messages
- `notifications(userId)`: User notifications
- `subcontractors(trade, search)`: Subcontractor directory
- `analytics`: Performance metrics

### Mutations
- `login(email, password)`: Authenticate user
- `register(input)`: Create new account
- `createProject(input)`: Create project
- `updateProject(id, input)`: Update project
- `publishProject(id)`: Publish project for bidding
- `createBid(input)`: Submit new bid
- `submitBid(id)`: Submit draft bid
- `awardBid(id)`: Award contract to bid
- `inviteSubcontractors(...)`: Send invitations
- `respondToInvitation(id, accept)`: Accept/decline invite
- `sendMessage(input)`: Send message
- `uploadDocument(input)`: Upload file
- `updateCompany(id, input)`: Update company profile

### Subscriptions
- `bidSubmitted(projectId)`: New bid submitted
- `bidUpdated(projectId)`: Bid status changed
- `invitationReceived(subcontractorId)`: New invitation
- `messageReceived(userId)`: New message
- `notificationCreated(userId)`: New notification

## Key Features Implementation

### DataLoader (N+1 Prevention)
All resolvers use DataLoader to batch and cache database queries:
- User loader: Batch load users by ID
- Company loader: Batch load companies
- Project loader: Batch load projects
- Bid loader: Batch load bids with counts

### Normalized Caching
URQL GraphCache provides normalized caching:
- Entities cached by ID
- Automatic cache updates on mutations
- Optimistic updates for instant UI feedback
- Cache invalidation strategies

### Real-time Updates
WebSocket subscriptions for live updates:
- Bid submissions notify contractors instantly
- Award notifications sent to subcontractors
- Real-time message delivery
- Live notification feed

### File Management
Cloudinary integration for scalable storage:
- Direct uploads from browser
- Automatic image optimization
- Secure signed URLs for private documents
- CDN delivery for fast access

### Email Notifications
Automated SendGrid emails for key events:
- Bid submission confirmations
- Award notifications
- Invitation reminders
- Deadline alerts

## Color Theme

BidForge uses a professional construction industry color palette:

- **Primary (Steel Gray)**: #708090 - Main brand color
- **Accent (Construction Orange)**: #FF8C42 - CTAs and highlights
- **Background**: #FAFAFA - Clean, light background
- **Card**: #FFFFFF - Content containers
- **Muted**: #F5F5F5 - Subtle backgrounds
- **Foreground**: #1A1A1A - Primary text
- **Muted Foreground**: #6B7280 - Secondary text

## Development Scripts

```bash
# Development server
bun dev

# Production build
bun run build

# Start production server
bun start

# Database operations
bun run db:push          # Push schema changes
bun run db:generate      # Generate migrations
bun run db:migrate       # Apply migrations
bun run db:studio        # Open Drizzle Studio
bun run db:indexes       # Apply performance indexes

# Monitoring & Health
bun run health           # Check application health
bun run metrics          # View performance metrics

# Security
bun run security:audit   # Run security audit

# Code quality
bun run lint             # Run ESLint
```

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables
4. Deploy automatically

### Environment Configuration
- Set all required environment variables
- Configure PostgreSQL database (Neon, Supabase, etc.)
- Set up Redis instance (Upstash recommended)
- Configure Cloudinary project
- Add SendGrid API key

### Database Migrations
```bash
# Generate migration
bun run db:generate

# Apply migrations
bun run db:push
```

## Security

### Authentication & Authorization
- **JWT-based Authentication**: Secure token storage with role-based access control
- **Role-based Access Control**: CONTRACTOR and SUBCONTRACTOR roles with granular permissions
- **Protected API Routes**: Middleware-based route protection with automatic redirects
- **Session Management**: Secure cookie-based session handling
- **Token Validation**: Comprehensive JWT structure validation with proper base64 encoding checks

### Data Protection & Input Validation
- **Password Security**: bcrypt hashing with strength validation and complexity requirements
- **Input Sanitization**: Comprehensive XSS prevention with HTML sanitization and path traversal protection
- **SQL Injection Prevention**: Parameterized queries with Drizzle ORM and input validation schemas
- **File Upload Security**: MIME type validation, size limits, and malicious file detection
- **Rate Limiting**: API endpoint protection against brute force attacks and abuse

### Security Headers & CSP
- **Security Headers**: Comprehensive security headers including X-Frame-Options, X-Content-Type-Options, HSTS
- **Content Security Policy**: Strict CSP with nonce-based script execution and resource restrictions
- **CORS Protection**: Proper cross-origin resource sharing configuration
- **Clickjacking Prevention**: Frame-ancestors directive and X-Frame-Options headers

## Logging & Monitoring

### Winston-based Logging System
- **Logging Framework**: Winston.js - Professional logging library for Node.js applications
- **Multi-transport Logging**: Console, file, and email transports for comprehensive coverage
- **Log Levels**: Configurable logging levels (error, warn, info, debug) with environment-based filtering
- **Structured Logging**: JSON-formatted logs with metadata for better analysis and searching
- **Log Rotation**: Automatic log file rotation with size limits (5MB) and retention (5 files)

### Email Alert System
- **Real-time Error Notifications**: Instant email alerts for all application errors via Gmail SMTP
- **Rich HTML Formatting**: Detailed error emails with stack traces, request context, and environment info
- **Smart Filtering**: Production-only email alerts with development override capability
- **Error Context**: Comprehensive error metadata including user info, request details, and timestamps

### Global Error Handling
- **API Error Handling**: Centralized error handling for all API endpoints with consistent responses
- **Uncaught Exception Handling**: Global process-level error catching with graceful shutdown
- **Client-side Error Monitoring**: React error boundaries with automatic error reporting
- **Request Logging**: Detailed HTTP request/response logging with performance metrics

### Monitoring Features
- **Health Check Endpoints**: `/api/health` for application status monitoring
- **Metrics Collection**: Performance metrics and application statistics via `/api/metrics`
- **Database Connection Monitoring**: Connection pool health and query performance tracking
- **Real-time Error Tracking**: Immediate notification system for critical errors

## Database Optimization

### Performance Indexes
- **Enhanced Indexing Strategy**: Comprehensive database indexes for optimal query performance
- **Composite Indexes**: Multi-column indexes for complex queries and filtering operations
- **Foreign Key Indexes**: Optimized relationship queries with proper indexing
- **Search Optimization**: Full-text search indexes for project and company discovery

### Connection Management
- **Connection Pooling**: Optimized PostgreSQL connection pool with configurable limits
- **Query Optimization**: Drizzle ORM with efficient query generation and N+1 prevention
- **Transaction Management**: Proper transaction handling for data consistency
- **Database Health Monitoring**: Connection status and performance metrics tracking

### Security Hardening
- **SQL Injection Prevention**: Parameterized queries and input validation at database level
- **Access Control**: Database-level user permissions and role-based access
- **Audit Logging**: Database operation logging for security and compliance
- **Backup Strategy**: Automated backup procedures with point-in-time recovery

## Anti-Hacker Protection

### Attack Prevention
- **Rate Limiting**: Multi-tier rate limiting for authentication, API calls, and file uploads
- **Brute Force Protection**: Account lockout and progressive delays for failed login attempts
- **DDoS Mitigation**: Request throttling and connection limits to prevent service disruption
- **Bot Detection**: User-Agent analysis and behavioral pattern recognition

### Input Security
- **Path Traversal Prevention**: Comprehensive path sanitization with iterative pattern removal
- **File Upload Security**: Malicious file detection, MIME type validation, and size restrictions
- **XSS Protection**: Multi-layer XSS prevention with input sanitization and output encoding
- **CSRF Protection**: Cross-site request forgery prevention with token validation

### Infrastructure Security
- **Secure Headers**: Complete security header implementation including HSTS and CSP
- **Environment Protection**: Secure environment variable handling and secrets management
- **File Permissions**: Proper file system permissions to prevent unauthorized access
- **Network Security**: Secure communication protocols and encrypted data transmission

### Monitoring & Response
- **Intrusion Detection**: Automated detection of suspicious activities and attack patterns
- **Real-time Alerts**: Immediate notification system for security incidents
- **Audit Trail**: Comprehensive logging of all security-relevant events and user actions
- **Incident Response**: Automated response procedures for detected security threats

## Performance Optimizations

- **DataLoader**: Batch and cache database queries
- **GraphCache**: Normalized client-side caching
- **Redis**: Server-side data caching
- **Cloudinary CDN**: Fast file delivery
- **Code Splitting**: Automatic with Next.js
- **Image Optimization**: Next.js Image component
- **Server Components**: Reduced client JavaScript

## Testing

```bash
# Run tests (if test framework is set up)
# bun test

# Run type checking (requires TypeScript configuration)
# bun run type-check
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@bidforge.com or open an issue in the GitHub repository.

## Acknowledgments

- Built with Next.js and React
- UI components from shadcn/ui
- GraphQL API with GraphQL Yoga
- Database ORM by Drizzle
- File storage by Cloudinary
- Icons by Lucide

---

**BidForge** - Connecting contractors with qualified subcontractors, one bid at a time.
