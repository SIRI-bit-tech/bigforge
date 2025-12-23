"use client"

import { useEffect, useState } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { FileText, Calendar, DollarSign, MapPin, Eye } from "lucide-react"
import { useRouter } from "next/navigation"

export default function MyBidsPage() {
  const router = useRouter()
  const { 
    currentUser, 
    projects, 
    loadProjects,
    loadBids
  } = useStore()
  
  const [loading, setLoading] = useState(true)
  const [myBids, setMyBids] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadProjects()
        
        // Load user's bids
        if (currentUser && currentUser.role === 'SUBCONTRACTOR') {
          const bids = await loadBids() // Load all bids for this user
          setMyBids(bids)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [loadProjects, loadBids, currentUser])

  if (!currentUser || currentUser.role !== 'SUBCONTRACTOR') {
    return (
      <EmptyState
        icon={FileText}
        title="Access Denied"
        description="Only subcontractors can view bids"
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your bids...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Bids</h1>
        <p className="text-muted-foreground">
          Track the status of your submitted bids
        </p>
      </div>

      {myBids.length > 0 ? (
        <div className="space-y-6">
          {myBids.map((bid) => {
            const project = projects.find(p => p.id === bid.projectId)
            if (!project) return null

            const getStatusColor = (status: string) => {
              switch (status) {
                case 'DRAFT': return 'secondary'
                case 'SUBMITTED': return 'default'
                case 'UNDER_REVIEW': return 'default'
                case 'SHORTLISTED': return 'default'
                case 'AWARDED': return 'default'
                case 'DECLINED': return 'destructive'
                case 'WITHDRAWN': return 'outline'
                default: return 'secondary'
              }
            }

            return (
              <Card key={bid.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                      <CardDescription className="mt-1">
                        Submitted on {bid.submittedAt ? formatDate(bid.submittedAt) : 'Draft'}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusColor(bid.status) as any}>
                      {bid.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Bid Amount: {formatCurrency(bid.totalAmount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{project.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Deadline: {formatDate(project.deadline)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>Project Budget: {
                        project.budgetMin && project.budgetMax 
                          ? `${formatCurrency(Number(project.budgetMin))} - ${formatCurrency(Number(project.budgetMax))}`
                          : 'Not specified'
                      }</span>
                    </div>
                  </div>

                  {bid.notes && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Your Notes:</h4>
                      <p className="text-sm text-muted-foreground">{bid.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Project
                    </Button>
                    
                    {bid.status === 'DRAFT' && (
                      <Button
                        onClick={() => router.push(`/projects/${project.id}/bid`)}
                        className="flex-1 bg-accent hover:bg-accent-hover text-white"
                      >
                        Continue Editing
                      </Button>
                    )}
                    
                    {bid.status === 'AWARDED' && (
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => router.push(`/projects/${project.id}`)}
                      >
                        🎉 Congratulations!
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No bids yet"
          description="You haven't submitted any bids. Browse available opportunities to get started."
          action={{
            label: "Browse Opportunities",
            onClick: () => router.push("/opportunities"),
          }}
        />
      )}
    </div>
  )
}