"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { BidCard } from "@/components/bid-card"
import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { DocumentUpload } from "@/components/document-upload"
import { DocumentViewer } from "@/components/document-viewer"
import { formatCurrency, formatDate, formatTimeUntil, getTradeLabel } from "@/lib/utils/format"
import { ArrowLeft, MapPin, DollarSign, Calendar, Clock, Users, FileText } from "lucide-react"
import Link from "next/link"

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { projects, companies, users, publishProject, closeProject, loadProjects, loadBids, currentUser } = useStore()
  const [loading, setLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [viewDocumentsOpen, setViewDocumentsOpen] = useState(false)
  const [projectBids, setProjectBids] = useState<any[]>([])

  // Load projects and bids on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadProjects()
        
        // Load bids for this project
        if (currentUser) {
          const bids = await loadBids(id)
          setProjectBids(bids)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [loadProjects, loadBids, id, currentUser])

  const project = projects.find((p) => p.id === id)
  
  // Check if current user is the project owner
  const isProjectOwner = currentUser && project && (project.createdBy === currentUser.id || project.createdById === currentUser.id)
  const isSubcontractor = currentUser?.role === 'SUBCONTRACTOR'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <EmptyState
        icon={FileText}
        title="Project not found"
        description="The project you're looking for doesn't exist or has been deleted"
        action={{
          label: "Back to Projects",
          onClick: () => router.push("/projects"),
        }}
      />
    )
  }

  const timeRemaining = formatTimeUntil(project.deadline)
  const avgBidAmount =
    projectBids.length > 0 ? projectBids.reduce((sum, b) => sum + b.totalAmount, 0) / projectBids.length : 0
  const lowestBid = projectBids.length > 0 ? Math.min(...projectBids.map((b) => b.totalAmount)) : 0
  const highestBid = projectBids.length > 0 ? Math.max(...projectBids.map((b) => b.totalAmount)) : 0

  return (
    <div>
      <div className="mb-8">
        <Link 
          href={isSubcontractor ? "/opportunities" : "/projects"} 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isSubcontractor ? "Back to Opportunities" : "Back to Projects"}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">{project.title}</h1>
                <StatusBadge status={project.status} />
              </div>
              <div className="flex gap-2">
                {/* Only show contractor actions if user is the project owner */}
                {isProjectOwner && project.status === "DRAFT" && (
                  <Button
                    onClick={() => {
                      publishProject(project.id)
                      router.refresh()
                    }}
                    className="bg-accent hover:bg-accent-hover text-white"
                  >
                    Publish Project
                  </Button>
                )}
                {isProjectOwner && project.status === "PUBLISHED" && (
                  <Button
                    onClick={() => {
                      closeProject(project.id)
                      router.refresh()
                    }}
                    variant="outline"
                  >
                    Close Bidding
                  </Button>
                )}
                {/* Subcontractor actions */}
                {isSubcontractor && project.status === "PUBLISHED" && (
                  <Button
                    onClick={() => router.push(`/projects/${project.id}/bid`)}
                    className="bg-accent hover:bg-accent-hover text-white"
                  >
                    Submit Bid
                  </Button>
                )}
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-6">{project.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{project.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>
                  Budget: {(project as any).budgetMin && (project as any).budgetMax 
                    ? `${formatCurrency(Number((project as any).budgetMin))} - ${formatCurrency(Number((project as any).budgetMax))}`
                    : project.budget 
                    ? formatCurrency(project.budget)
                    : 'Not specified'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {project.startDate && project.endDate 
                    ? `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`
                    : 'Dates not specified'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className={new Date(project.deadline) < new Date() ? "text-destructive" : "text-warning"}>
                  Deadline: {timeRemaining}
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">Required Trades</h3>
              <div className="flex flex-wrap gap-2">
                {(project.trades || []).map((trade) => (
                  <span key={trade} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {getTradeLabel(trade)}
                  </span>
                ))}
                {(!project.trades || project.trades.length === 0) && (
                  <span className="text-sm text-muted-foreground">No specific trades required</span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">
              {isProjectOwner ? `Bids Received (${projectBids.length})` : 'Project Bids'}
            </h2>

            {projectBids.length > 0 ? (
              <>
                {/* Only show bid statistics to project owner */}
                {isProjectOwner && (
                  <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-border">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Average Bid</div>
                      <div className="text-lg font-bold">{formatCurrency(avgBidAmount)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Lowest Bid</div>
                      <div className="text-lg font-bold text-success">{formatCurrency(lowestBid)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Highest Bid</div>
                      <div className="text-lg font-bold text-destructive">{formatCurrency(highestBid)}</div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {projectBids.map((bid) => {
                    const subcontractor = users.find((u) => u.id === bid.subcontractorId)
                    const company = subcontractor ? companies.find((c) => c.id === subcontractor.companyId) : undefined
                    return <BidCard key={bid.id} bid={bid} company={company} />
                  })}
                </div>
              </>
            ) : (
              <EmptyState
                icon={Users}
                title={isProjectOwner ? "No bids yet" : "No bids submitted"}
                description={
                  isProjectOwner 
                    ? "Invite subcontractors to start receiving bids for this project"
                    : "This project hasn't received any bids yet"
                }
                action={
                  isProjectOwner 
                    ? {
                        label: "Invite Subcontractors",
                        onClick: () => router.push("/subcontractors"),
                      }
                    : undefined
                }
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold mb-4">
              {isProjectOwner ? "Project Actions" : "Available Actions"}
            </h3>
            <div className="space-y-2">
              {/* Contractor-only actions */}
              {isProjectOwner && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => router.push("/subcontractors")}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Invite Subcontractors
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-transparent"
                    onClick={() => setUploadModalOpen(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-transparent"
                    onClick={() => setViewDocumentsOpen(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Documents
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Timeline
                  </Button>
                </>
              )}
              
              {/* Subcontractor actions */}
              {isSubcontractor && (
                <>
                  {project.status === "PUBLISHED" && (
                    <Button
                      className="w-full justify-start bg-accent hover:bg-accent-hover text-white"
                      onClick={() => router.push(`/projects/${project.id}/bid`)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Submit Bid
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-transparent"
                    onClick={() => {
                      // Navigate to messages with pre-selected conversation
                      const contractorId = project.createdById || project.createdBy
                      router.push(`/messages?project=${project.id}&user=${contractorId}`)
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Contact Contractor
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-transparent"
                    onClick={() => setViewDocumentsOpen(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Documents
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-transparent"
                    onClick={() => {
                      // Navigate to project timeline page (to be implemented)
                      router.push(`/projects/${project.id}/timeline`)
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Timeline
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Upload Modal */}
      {project && (
        <DocumentUpload
          projectId={project.id}
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onUploadComplete={(document) => {
            console.log('Document uploaded:', document)
            // You can add the document to the store or refresh the documents list here
          }}
        />
      )}

      {/* Document Viewer Modal */}
      {project && (
        <DocumentViewer
          projectId={project.id}
          isOpen={viewDocumentsOpen}
          onClose={() => setViewDocumentsOpen(false)}
        />
      )}
    </div>
  )
}
