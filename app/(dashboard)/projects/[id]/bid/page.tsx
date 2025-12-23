"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, DollarSign, FileText, Calendar } from "lucide-react"
import Link from "next/link"

export default function SubmitBidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { projects, currentUser, createBid, loadProjects } = useStore()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    totalAmount: "",
    notes: "",
    completionTime: "",
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadProjects()
      } catch (error) {
        console.error('Failed to load project:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [loadProjects])

  const project = projects.find((p) => p.id === id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project || !currentUser) return

    setSubmitting(true)
    try {
      const bidData = {
        projectId: project.id,
        totalAmount: parseFloat(formData.totalAmount),
        notes: formData.notes,
        lineItems: [], // For now, we'll keep it simple
        alternates: [], // For now, we'll keep it simple
      }

      // Submit bid via API
      const response = await fetch('/api/bids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bidData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit bid')
      }
      
      toast({
        title: "Bid Submitted Successfully!",
        description: "Your bid has been submitted and is now under review.",
      })
      
      // Navigate back to project or to bids page
      router.push(`/my-bids`)
    } catch (error) {
      console.error('Failed to submit bid:', error)
      toast({
        title: "Failed to Submit Bid",
        description: error instanceof Error ? error.message : "There was an error submitting your bid. Please try again.",
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
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/opportunities')}>
            Back to Opportunities
          </Button>
        </div>
      </div>
    )
  }

  if (currentUser?.role !== 'SUBCONTRACTOR') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">Only subcontractors can submit bids.</p>
          <Button onClick={() => router.push('/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  const isValid = formData.totalAmount && parseFloat(formData.totalAmount) > 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link 
          href={`/projects/${id}`} 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-4">Submit Bid</h1>
        <p className="text-muted-foreground mt-1">Submit your bid for: {project.title}</p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Bid Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Bid Amount (USD) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    placeholder="Enter your bid amount"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="completionTime">Estimated Completion Time (days)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="completionTime"
                    type="number"
                    min="1"
                    value={formData.completionTime}
                    onChange={(e) => setFormData({ ...formData, completionTime: e.target.value })}
                    placeholder="e.g., 30"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Include any additional information about your bid, approach, or qualifications..."
                  rows={6}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => router.push(`/projects/${id}`)} 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-accent hover:bg-accent-hover text-white"
                  disabled={!isValid || submitting}
                >
                  {submitting ? "Submitting..." : "Submit Bid"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}