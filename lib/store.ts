"use client"

import { create } from "zustand"
import type {
  User,
  Company,
  Project,
  Bid,
  Document,
  Invitation,
  Message,
  Notification,
  UserRole,
  InvitationStatus,
} from "./types"

// In-memory data store with production-ready patterns
interface AppState {
  // Auth state
  currentUser: User | null
  isAuthenticated: boolean

  // Data stores
  users: User[]
  companies: Company[]
  projects: Project[]
  bids: Bid[]
  documents: Document[]
  invitations: Invitation[]
  messages: Message[]
  notifications: Notification[]

  // Auth actions
  login: (email: string, password: string) => Promise<User>
  register: (email: string, password: string, name: string, role: UserRole) => Promise<{ user: User; needsVerification: boolean }>
  verifyEmail: (email: string, code: string) => Promise<boolean>
  resendVerificationCode: (email: string) => Promise<void>
  logout: () => Promise<void>
  restoreSession: () => Promise<User | null>
  checkAuthStatus: () => Promise<boolean>

  // Data loading actions
  loadUsers: () => Promise<User[]>
  loadCompanies: () => Promise<Company[]>
  loadProjects: () => Promise<Project[]>
  loadSubcontractors: () => Promise<User[]>

  // Company actions
  createCompany: (data: Partial<Company>) => Company
  updateCompany: (id: string, data: Partial<Company>) => Company
  getCompany: (id: string) => Company | undefined

  // Subcontractor discovery actions
  getSubcontractors: () => User[]
  searchSubcontractors: (query: string, tradeIds?: string[]) => User[]
  getSubcontractorsByTrade: (tradeId: string) => User[]
  getSubcontractorProfile: (userId: string) => { user: User; company?: Company } | null

  // Project actions
  createProject: (data: Partial<Project>) => Project
  updateProject: (id: string, data: Partial<Project>) => Project
  publishProject: (id: string) => Project
  closeProject: (id: string) => Project
  getProject: (id: string) => Project | undefined
  getProjectsByUser: (userId: string) => Project[]

  // Bid actions
  createBid: (data: Partial<Bid>) => Bid
  updateBid: (id: string, data: Partial<Bid>) => Bid
  submitBid: (id: string) => Bid
  withdrawBid: (id: string) => Bid
  awardBid: (id: string) => Bid
  getBid: (id: string) => Bid | undefined
  getBidsByProject: (projectId: string) => Bid[]
  getBidsBySubcontractor: (subcontractorId: string) => Bid[]
  loadBids: (projectId?: string) => Promise<Bid[]>

  // Invitation actions
  inviteSubcontractors: (projectId: string, subcontractorIds: string[]) => Promise<Invitation[]>
  acceptInvitation: (id: string) => Invitation
  declineInvitation: (id: string) => Invitation
  getInvitationsBySubcontractor: (subcontractorId: string) => Invitation[]

  // Document actions
  uploadDocument: (data: Partial<Document>) => Document
  deleteDocument: (id: string) => void
  getDocumentsByProject: (projectId: string) => Document[]

  // Message actions
  sendMessage: (data: Partial<Message>) => Promise<Message>
  getMessagesByUser: (userId: string) => Promise<Message[]>
  getMessagesByProject: (projectId: string) => Promise<Message[]>
  markMessageAsRead: (id: string) => Promise<void>
  addMessage: (message: Message) => void

  // Notification actions
  createNotification: (data: Partial<Notification>) => Notification
  getNotificationsByUser: (userId: string) => Notification[]
  markNotificationAsRead: (id: string) => void
  markAllNotificationsAsRead: (userId: string) => void
}

// Helper function to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 15)

// Seed data for testing - Remove in production
const seedData = () => {
  return {
    users: [],
    companies: [],
    projects: [],
    bids: [],
    invitations: [],
    documents: [],
    messages: [],
    notifications: [],
  }
}

export const useStore = create<AppState>((set, get) => ({
  // Initialize with seed data
  ...seedData(),
  currentUser: null,
  isAuthenticated: false,

  // Auth actions
  login: async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    // Set authenticated user
    const user: User = {
      ...data.user,
      createdAt: new Date(data.user.createdAt),
      updatedAt: new Date(data.user.updatedAt),
    }

    set({ currentUser: user, isAuthenticated: true })
    return user
  },

  register: async (email: string, password: string, name: string, role: UserRole) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name, role }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed')
    }

    // Add user to local store (in production, this would come from your database)
    const newUser: User = {
      ...data.user,
      password: undefined, // Never store password in client state
      createdAt: new Date(data.user.createdAt),
      updatedAt: new Date(data.user.updatedAt),
    }

    set((state) => ({
      users: [...state.users, newUser],
    }))

    return { user: newUser, needsVerification: data.needsVerification }
  },

  verifyEmail: async (email: string, code: string) => {
    const response = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Verification failed')
    }

    // Update user in local store and set as authenticated
    const verifiedUser = get().users.find(u => u.email === email)
    if (verifiedUser) {
      const updatedUser = {
        ...verifiedUser,
        emailVerified: true,
        verificationCode: undefined,
        verificationCodeExpiry: undefined,
        updatedAt: new Date(),
      }

      set((state) => ({
        users: state.users.map((u) =>
          u.email === email ? updatedUser : u
        ),
        // Automatically log in the user after verification
        currentUser: updatedUser,
        isAuthenticated: true,
      }))
    }

    return true
  },

  resendVerificationCode: async (email: string) => {
    const response = await fetch('/api/auth/resend-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to resend code')
    }

    return
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Logout API call failed:', error)
      // Continue with local logout even if API fails
    }
    
    set({ currentUser: null, isAuthenticated: false })
  },

  restoreSession: async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // Include cookies
      })

      if (!response.ok) {
        // No valid session
        set({ currentUser: null, isAuthenticated: false })
        return null
      }

      const data = await response.json()
      const user: User = {
        ...data.user,
        createdAt: new Date(data.user.createdAt),
        updatedAt: new Date(data.user.updatedAt),
      }

      set({ currentUser: user, isAuthenticated: true })
      return user
    } catch (error) {
      console.error('Session restoration failed:', error)
      set({ currentUser: null, isAuthenticated: false })
      return null
    }
  },

  checkAuthStatus: async () => {
    const user = await get().restoreSession()
    return user !== null
  },

  // Data loading actions
  loadUsers: async () => {
    try {
      // For contractors without company, only load subcontractors
      // For subcontractors without company, only load contractors
      const currentUser = get().currentUser
      let endpoint = '/api/users'
      
      if (currentUser && !currentUser.companyId) {
        if (currentUser.role === 'CONTRACTOR') {
          endpoint = '/api/users?role=SUBCONTRACTOR'
        } else if (currentUser.role === 'SUBCONTRACTOR') {
          endpoint = '/api/users?role=CONTRACTOR'
        }
      }
        
      const response = await fetch(endpoint)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load users')
      }

      const users = data.users.map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      }))

      set({ users })
      return users
    } catch (error) {
      console.error('Failed to load users:', error)
      return []
    }
  },

  loadCompanies: async () => {
    try {
      const response = await fetch('/api/companies')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load companies')
      }

      const companies = data.companies.map((company: any) => ({
        ...company,
        createdAt: new Date(company.createdAt),
        updatedAt: new Date(company.updatedAt),
      }))

      set({ companies })
      return companies
    } catch (error) {
      console.error('Failed to load companies:', error)
      return []
    }
  },

  loadProjects: async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load projects')
      }

      const projects = data.projects.map((project: any) => ({
        ...project,
        startDate: project.startDate ? new Date(project.startDate) : null,
        endDate: project.endDate ? new Date(project.endDate) : null,
        deadline: new Date(project.deadline),
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
      }))

      set({ projects })
      return projects
    } catch (error) {
      console.error('Failed to load projects:', error)
      return []
    }
  },

  loadSubcontractors: async () => {
    try {
      const response = await fetch('/api/users?role=SUBCONTRACTOR')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load subcontractors')
      }

      const subcontractors = data.users.map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      }))

      // Update users array with subcontractors
      set((state) => ({
        users: [
          ...state.users.filter(u => u.role !== 'SUBCONTRACTOR'),
          ...subcontractors
        ]
      }))

      return subcontractors
    } catch (error) {
      console.error('Failed to load subcontractors:', error)
      return []
    }
  },

  // Company actions
  createCompany: (data) => {
    const newCompany: Company = {
      id: generateId(),
      name: data.name || "",
      type: data.type || "",
      address: data.address || "",
      phone: data.phone || "",
      website: data.website,
      description: data.description,
      logo: data.logo,
      trades: data.trades || [],
      certifications: data.certifications || [],
      createdAt: new Date(),
    }
    set((state) => ({ companies: [...state.companies, newCompany] }))
    return newCompany
  },

  updateCompany: (id, data) => {
    set((state) => ({
      companies: state.companies.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }))
    return get().companies.find((c) => c.id === id)!
  },

  getCompany: (id) => {
    return get().companies.find((c) => c.id === id)
  },

  // Subcontractor discovery actions
  getSubcontractors: () => {
    return get().users.filter((user) => user.role === "SUBCONTRACTOR")
  },

  searchSubcontractors: (query: string, tradeIds?: string[]) => {
    const subcontractors = get().getSubcontractors()
    const companies = get().companies
    
    return subcontractors.filter((user) => {
      const company = companies.find((c) => c.id === user.companyId)
      
      // Text search in name, company name, or description
      const matchesText = query === "" || 
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        (company?.name?.toLowerCase().includes(query.toLowerCase())) ||
        (company?.description?.toLowerCase().includes(query.toLowerCase()))
      
      // Trade filter - for now, skip trade filtering if no company trades are loaded
      const matchesTrades = !tradeIds || tradeIds.length === 0 || 
        (company?.trades?.some(trade => tradeIds.includes(trade)))
      
      return matchesText && matchesTrades
    })
  },

  getSubcontractorsByTrade: (tradeId: string) => {
    const subcontractors = get().getSubcontractors()
    const companies = get().companies
    
    return subcontractors.filter((user) => {
      const company = companies.find((c) => c.id === user.companyId)
      return company?.trades.includes(tradeId as any)
    })
  },

  getSubcontractorProfile: (userId: string) => {
    const user = get().users.find((u) => u.id === userId && u.role === "SUBCONTRACTOR")
    if (!user) return null
    
    const company = user.companyId ? get().getCompany(user.companyId) : undefined
    
    return { user, company }
  },

  // Project actions
  createProject: (data) => {
    const currentUser = get().currentUser
    if (!currentUser) throw new Error("Not authenticated")

    const newProject: Project = {
      id: generateId(),
      title: data.title || "",
      description: data.description || "",
      location: data.location || "",
      budget: data.budget || 0,
      startDate: data.startDate || new Date(),
      endDate: data.endDate || new Date(),
      deadline: data.deadline || new Date(),
      status: "DRAFT",
      createdBy: currentUser.id,
      trades: data.trades || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    set((state) => ({ projects: [...state.projects, newProject] }))
    return newProject
  },

  updateProject: (id, data) => {
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...data, updatedAt: new Date() } : p)),
    }))
    return get().projects.find((p) => p.id === id)!
  },

  publishProject: (id) => {
    return get().updateProject(id, { status: "PUBLISHED" })
  },

  closeProject: (id) => {
    return get().updateProject(id, { status: "CLOSED" })
  },

  getProject: (id) => {
    return get().projects.find((p) => p.id === id)
  },

  getProjectsByUser: (userId) => {
    return get().projects.filter((p) => p.createdBy === userId)
  },

  // Bid actions
  createBid: (data) => {
    const currentUser = get().currentUser
    if (!currentUser) throw new Error("Not authenticated")

    const newBid: Bid = {
      id: generateId(),
      projectId: data.projectId || "",
      subcontractorId: currentUser.id,
      totalAmount: data.totalAmount || 0,
      status: "DRAFT",
      notes: data.notes,
      submittedAt: undefined,
      updatedAt: new Date(),
      lineItems: data.lineItems || [],
      alternates: data.alternates || [],
    }
    set((state) => ({ bids: [...state.bids, newBid] }))
    return newBid
  },

  updateBid: (id, data) => {
    set((state) => ({
      bids: state.bids.map((b) => (b.id === id ? { ...b, ...data, updatedAt: new Date() } : b)),
    }))
    return get().bids.find((b) => b.id === id)!
  },

  submitBid: (id) => {
    const bid = get().updateBid(id, {
      status: "SUBMITTED",
      submittedAt: new Date(),
    })

    // Create notification for contractor
    const project = get().getProject(bid.projectId)
    if (project) {
      const company = get().companies.find(
        (c) => c.id === get().users.find((u) => u.id === bid.subcontractorId)?.companyId,
      )
      get().createNotification({
        userId: project.createdBy,
        type: "BID_SUBMITTED",
        title: "New Bid Submitted",
        message: `${company?.name} has submitted a bid for ${project.title}`,
        read: false,
        createdAt: new Date(),
        link: `/projects/${project.id}/bids/${bid.id}`,
      })
    }

    return bid
  },

  withdrawBid: (id) => {
    return get().updateBid(id, { status: "WITHDRAWN" })
  },

  awardBid: (id) => {
    const bid = get().updateBid(id, { status: "AWARDED" })
    const project = get().getProject(bid.projectId)

    if (project) {
      // Update project status
      get().updateProject(project.id, { status: "AWARDED" })

      // Notify winning bidder
      get().createNotification({
        userId: bid.subcontractorId,
        type: "BID_AWARDED",
        title: "Congratulations! Bid Awarded",
        message: `Your bid for ${project.title} has been awarded!`,
        read: false,
        createdAt: new Date(),
        link: `/my-bids/${bid.id}`,
      })

      // Decline other bids
      const otherBids = get()
        .getBidsByProject(project.id)
        .filter((b) => b.id !== id)
      otherBids.forEach((b) => {
        get().updateBid(b.id, { status: "DECLINED" })
        get().createNotification({
          userId: b.subcontractorId,
          type: "BID_AWARDED",
          title: "Bid Not Selected",
          message: `Thank you for your bid on ${project.title}. Another contractor was selected for this project.`,
          read: false,
          createdAt: new Date(),
        })
      })
    }

    return bid
  },

  getBid: (id) => {
    return get().bids.find((b) => b.id === id)
  },

  getBidsByProject: (projectId) => {
    return get().bids.filter((b) => b.projectId === projectId)
  },

  getBidsBySubcontractor: (subcontractorId) => {
    return get().bids.filter((b) => b.subcontractorId === subcontractorId)
  },

  loadBids: async (projectId?: string) => {
    try {
      const url = projectId ? `/api/bids?projectId=${projectId}` : '/api/bids'
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load bids')
      }

      const bids = data.bids.map((bid: any) => ({
        ...bid,
        totalAmount: parseFloat(bid.totalAmount),
        submittedAt: bid.submittedAt ? new Date(bid.submittedAt) : undefined,
        createdAt: new Date(bid.createdAt),
        updatedAt: new Date(bid.updatedAt),
      }))

      // Update local state with loaded bids
      set((state) => ({
        bids: projectId 
          ? [...state.bids.filter(b => b.projectId !== projectId), ...bids]
          : bids
      }))

      return bids
    } catch (error) {
      console.error('Failed to load bids:', error)
      return []
    }
  },

  // Invitation actions
  inviteSubcontractors: async (projectId, subcontractorIds) => {
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          subcontractorIds,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitations')
      }

      // Update local state with new invitations
      const newInvitations = data.invitations.map((invitation: any) => ({
        ...invitation,
        sentAt: new Date(invitation.sentAt),
        respondedAt: invitation.respondedAt ? new Date(invitation.respondedAt) : undefined,
      }))

      set((state) => ({ 
        invitations: [...state.invitations, ...newInvitations] 
      }))

      // Create notifications for invited subcontractors
      const project = get().getProject(projectId)
      if (project) {
        subcontractorIds.forEach((subId) => {
          get().createNotification({
            userId: subId,
            type: "INVITATION",
            title: "New Bid Invitation",
            message: `You've been invited to bid on ${project.title}`,
            read: false,
            createdAt: new Date(),
            link: `/opportunities`,
          })
        })
      }

      return newInvitations
    } catch (error) {
      console.error('Failed to send invitations:', error)
      throw error
    }
  },

  acceptInvitation: (id) => {
    set((state) => ({
      invitations: state.invitations.map((inv) =>
        inv.id === id ? { ...inv, status: "ACCEPTED" as InvitationStatus, respondedAt: new Date() } : inv,
      ),
    }))
    return get().invitations.find((inv) => inv.id === id)!
  },

  declineInvitation: (id) => {
    set((state) => ({
      invitations: state.invitations.map((inv) =>
        inv.id === id ? { ...inv, status: "DECLINED" as InvitationStatus, respondedAt: new Date() } : inv,
      ),
    }))
    return get().invitations.find((inv) => inv.id === id)!
  },

  getInvitationsBySubcontractor: (subcontractorId) => {
    return get().invitations.filter((inv) => inv.subcontractorId === subcontractorId)
  },

  // Document actions
  uploadDocument: (data) => {
    const currentUser = get().currentUser
    if (!currentUser) throw new Error("Not authenticated")

    const newDoc: Document = {
      id: generateId(),
      projectId: data.projectId || "",
      name: data.name || "",
      type: data.type || "OTHER",
      url: data.url || "",
      size: data.size || 0,
      uploadedBy: currentUser.id,
      uploadedAt: new Date(),
      version: 1,
    }
    set((state) => ({ documents: [...state.documents, newDoc] }))
    return newDoc
  },

  deleteDocument: (id) => {
    set((state) => ({ documents: state.documents.filter((d) => d.id !== id) }))
  },

  getDocumentsByProject: (projectId) => {
    return get().documents.filter((d) => d.projectId === projectId)
  },

  // Message actions
  sendMessage: async (data) => {
    const currentUser = get().currentUser
    if (!currentUser) throw new Error("Not authenticated")

    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: data.projectId,
        receiverId: data.receiverId,
        text: data.text,
        senderId: currentUser.id,
        bidId: data.bidId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send message')
    }

    // Add message to local state
    const newMessage: Message = {
      ...result.message,
      sentAt: new Date(result.message.sentAt),
    }
    
    set((state) => ({ messages: [...state.messages, newMessage] }))

    // Create notification
    get().createNotification({
      userId: newMessage.receiverId,
      type: "MESSAGE",
      title: "New Message",
      message: `You have a new message from ${currentUser.name}`,
      read: false,
      createdAt: new Date(),
      link: `/messages`,
    })

    return newMessage
  },

  getMessagesByUser: async (userId: string) => {
    try {
      const response = await fetch(`/api/messages?userId=${userId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch messages')
      }

      const messages = result.messages.map((msg: any) => ({
        ...msg,
        sentAt: new Date(msg.sentAt),
      }))

      // Update local state
      set({ messages })
      return messages
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      throw error
    }
  },

  getMessagesByProject: async (projectId: string) => {
    const currentUser = get().currentUser
    if (!currentUser) throw new Error("Not authenticated")

    const response = await fetch(`/api/messages?userId=${currentUser.id}&projectId=${projectId}`)
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch messages')
    }

    return result.messages.map((msg: any) => ({
      ...msg,
      sentAt: new Date(msg.sentAt),
    }))
  },

  markMessageAsRead: async (id: string) => {
    try {
      const response = await fetch(`/api/messages/${id}/read`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const result = await response.json()
        
        // If it's a 403 error, it means the user is not authorized to mark this message as read
        // This could happen if they're trying to mark a message they sent (not received)
        if (response.status === 403) {
          return // Don't throw error, just skip
        }
        
        throw new Error(result.error || 'Failed to mark message as read')
      }

      // Update local state only if API call succeeded
      set((state) => ({
        messages: state.messages.map((m) => (m.id === id ? { ...m, read: true } : m)),
      }))
    } catch (error) {
      console.error(`Error marking message ${id} as read:`, error)
      throw error
    }
  },

  addMessage: (message: Message) => {
    set((state) => {
      // Check if message already exists to prevent duplicates
      const messageExists = state.messages.some(m => m.id === message.id)
      if (messageExists) {
        return state // Don't add duplicate
      }
      
      return { messages: [...state.messages, message] }
    })
  },

  // Notification actions
  createNotification: (data) => {
    const newNotification: Notification = {
      id: generateId(),
      userId: data.userId || "",
      type: data.type || "MESSAGE",
      title: data.title || "",
      message: data.message || "",
      read: false,
      createdAt: new Date(),
      link: data.link,
    }
    set((state) => ({ notifications: [...state.notifications, newNotification] }))
    return newNotification
  },

  getNotificationsByUser: (userId) => {
    return get()
      .notifications.filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  },

  markNotificationAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }))
  },

  markAllNotificationsAsRead: (userId) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
    }))
  },
}))
