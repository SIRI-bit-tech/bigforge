"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { formatCurrency, formatDateTime } from "@/lib/utils/format"
import { ArrowLeft, FileText, User, Calendar, DollarSign, MessageSquare, Award, FileCheck } from "lucide-react"
import Link from "next/link"

export default function BidDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string; bidId: string }> 
}) {
  const { id: projectId, bidId } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { projects, users, companies, currentUser, loadProjects, loadBids, awardBid, sendMessage } = useStore()
  const [loading, setLoading] = useState(true)
  const [bid, setBid] = useState<any>(null)
  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const [clarificationModalOpen, setClarificationModalOpen] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [clarificationText, setClarificationText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadProjects()
        const bids = await loadBids(projectId)
        const foundBid = bids.find(b => b.id === bidId)
        setBid(foundBid)
      } catch (error) {
        console.error('Failed to load bid details:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [loadProjects, loadBids, projectId, bidId])

  const project = projects.find((p) => p.id === projectId)
  const subcontractor = bid ? users.find((u) => u.id === bid.subcontractorId) : null
  const company = subcontractor ? companies.find((c) => c.id === subcontractor.companyId) : null

  // Check if current user can view this bid
  const canViewBid = currentUser && (
    currentUser.role === 'CONTRACTOR' && project?.createdById === currentUser.id ||
    currentUser.role === 'SUBCONTRACTOR' && bid?.subcontractorId === currentUser.id
  )

  const handleAwardBid = async () => {
    if (!bid || !currentUser) return
    
    setSubmitting(true)
    try {
      awardBid(bid.id)
      
      // Send notification message to subcontractor
      await sendMessage({
        projectId: projectId,
        receiverId: bid.subcontractorId,
        text: `Congratulations! Your bid for "${project?.title}" has been awarded. We'll be in touch soon with next steps.`,
      })
      
      toast({
        title: "Bid Awarded Successfully!",
        description: "The subcontractor has been notified of the award.",
      })
      
      // Refresh the bid data
      const bids = await loadBids(projectId)
      const updatedBid = bids.find(b => b.id === bidId)
      setBid(updatedBid)
      
    } catch (error) {
      console.error('Failed to award bid:', error)
      toast({
        title: "Failed to Award Bid",
        description: "There was an error awarding the bid. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !bid || !currentUser) return
    
    setSubmitting(true)
    try {
      const receiverId = currentUser.role === 'CONTRACTOR' 
        ? bid.subcontractorId 
        : project?.createdById
      
      await sendMessage({
        projectId: projectId,
        receiverId: receiverId,
        text: messageText,
      })
      
      toast({
        title: "Message Sent!",
        description: "Your message has been sent successfully.",
      })
      
      setMessageText("")
      setMessageModalOpen(false)
      
    } catch (error) {
      console.error('Failed to send message:', error)
      toast({
        title: "Failed to Send Message",
        description: "There was an error sending your message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestClarification = async () => {
    if (!clarificationText.trim() || !bid || !currentUser) return
    
    setSubmitting(true)
    try {
      await sendMessage({
        projectId: projectId,
        receiverId: bid.subcontractorId,
        text: `Clarification Request for Bid:\n\n${clarificationText}`,
      })
      
      toast({
        title: "Clarification Requested!",
        description: "The subcontractor has been notified of your request.",
      })
      
      setClarificationText("")
      setClarificationModalOpen(false)
      
    } catch (error) {
      console.error('Failed to request clarification:', error)
      toast({
        title: "Failed to Request Clarification",
        description: "There was an error sending your request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bid details...</p>
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

  if (!bid) {
    return (
      <EmptyState
        icon={FileText}
        title="Bid not found"
        description="The bid you're looking for doesn't exist or has been deleted"
        action={{
          label: "Back to Project",
          onClick: () => router.push(`/projects/${projectId}`),
        }}
      />
    )
  }

  if (!canViewBid) {
    return (
      <EmptyState
        icon={FileText}
        title="Access denied"
        description="You don't have permission to view this bid"
        action={{
          label: "Back to Project",
          onClick: () => router.push(`/projects/${projectId}`),
        }}
      />
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link 
          href={`/projects/${projectId}`} 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-4">Bid Details</h1>
        <p className="text-muted-foreground mt-1">
          Bid for: {project.title}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Bid Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Bid Overview
                </CardTitle>
                <StatusBadge status={bid.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-3xl font-bold text-foreground">
                  {formatCurrency(bid.totalAmount)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total bid amount
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Line Items</div>
                  <div className="font-semibold">{bid.lineItems?.length || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Alternates</div>
                  <div className="font-semibold">{bid.alternates?.length || 0}</div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {bid.submittedAt 
                      ? `Submitted ${formatDateTime(bid.submittedAt)}`
                      : 'Draft - Not submitted yet'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bid Notes */}
          {bid.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Additional Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {bid.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Line Items - if available */}
          {bid.lineItems && bid.lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bid.lineItems.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium">{item.description}</div>
                        <div className="text-sm text-muted-foreground">
                          Qty: {item.quantity} {item.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(item.total)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(item.unitPrice)}/{item.unit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subcontractor Info */}
          {company && subcontractor && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Subcontractor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white font-bold">
                    {company.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{company.name}</div>
                    <div className="text-sm text-muted-foreground">{company.type}</div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Contact:</span>
                    <div>{subcontractor.name}</div>
                    <div className="text-muted-foreground">{subcontractor.email}</div>
                  </div>
                  
                  {company.phone && (
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <div>{company.phone}</div>
                    </div>
                  )}
                  
                  {company.address && (
                    <div>
                      <span className="text-muted-foreground">Address:</span>
                      <div>{company.address}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {currentUser?.role === 'CONTRACTOR' && bid.status === 'SUBMITTED' && (
                <>
                  <Button 
                    className="w-full bg-accent hover:bg-accent-hover text-white"
                    onClick={handleAwardBid}
                    disabled={submitting}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    {submitting ? "Awarding..." : "Award Bid"}
                  </Button>
                  
                  <Dialog open={clarificationModalOpen} onOpenChange={setClarificationModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <FileCheck className="h-4 w-4 mr-2" />
                        Request Clarification
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Clarification</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="clarification">What clarification do you need?</Label>
                          <Textarea
                            id="clarification"
                            value={clarificationText}
                            onChange={(e) => setClarificationText(e.target.value)}
                            placeholder="Please provide more details about..."
                            rows={4}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setClarificationModalOpen(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleRequestClarification}
                            disabled={!clarificationText.trim() || submitting}
                            className="flex-1"
                          >
                            {submitting ? "Sending..." : "Send Request"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              
              {currentUser?.role === 'SUBCONTRACTOR' && bid.status === 'DRAFT' && (
                <Button className="w-full bg-accent hover:bg-accent-hover text-white">
                  Submit Bid
                </Button>
              )}
              
              <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Send Message to {currentUser?.role === 'CONTRACTOR' ? 'Subcontractor' : 'Contractor'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type your message here..."
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setMessageModalOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || submitting}
                        className="flex-1"
                      >
                        {submitting ? "Sending..." : "Send Message"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}