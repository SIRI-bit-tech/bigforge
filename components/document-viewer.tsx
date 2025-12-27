"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import { FileText, Download, Eye, Calendar, User, File } from "lucide-react"
import { formatDate, formatFileSize } from "@/lib/utils/format"

interface Document {
  id: string
  name: string
  type: string
  url: string
  size?: number
  uploadedAt: string
  uploadedById: string
}

interface DocumentViewerProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

const DOCUMENT_TYPE_LABELS = {
  BLUEPRINT: "Blueprint",
  SPECIFICATION: "Specification", 
  CONTRACT: "Contract",
  ADDENDUM: "Addendum",
  PHOTO: "Photo",
  OTHER: "Other",
}

const DOCUMENT_TYPE_COLORS = {
  BLUEPRINT: "bg-blue-100 text-blue-800",
  SPECIFICATION: "bg-green-100 text-green-800",
  CONTRACT: "bg-purple-100 text-purple-800", 
  ADDENDUM: "bg-orange-100 text-orange-800",
  PHOTO: "bg-pink-100 text-pink-800",
  OTHER: "bg-gray-100 text-gray-800",
}

export function DocumentViewer({ projectId, isOpen, onClose }: DocumentViewerProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")

  // Load documents when modal opens
  useEffect(() => {
    if (isOpen && projectId) {
      loadDocuments()
    }
  }, [isOpen, projectId])

  const loadDocuments = async () => {
    setLoading(true)
    setError("")
    
    try {
      const response = await fetch(`/api/documents?projectId=${projectId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load documents')
      }
      
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      // Failed to load documents
      setError(error instanceof Error ? error.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (document: Document) => {
    // Open document URL in new tab for download/viewing
    window.open(document.url, '_blank')
  }

  const handleView = (document: Document) => {
    // Open document URL in new tab for viewing
    window.open(document.url, '_blank')
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    switch (extension) {
      case 'pdf':
        return <File className="h-4 w-4 text-red-500" />
      case 'doc':
      case 'docx':
        return <File className="h-4 w-4 text-blue-500" />
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <File className="h-4 w-4 text-green-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Project Documents</DialogTitle>
          <DialogDescription>
            View and download project documents, blueprints, and specifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading documents...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadDocuments} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && documents.length === 0 && (
            <EmptyState
              icon={FileText}
              title="No documents available"
              description="This project doesn't have any documents uploaded yet."
            />
          )}

          {!loading && !error && documents.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(document.name)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium truncate">{document.name}</h4>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${DOCUMENT_TYPE_COLORS[document.type as keyof typeof DOCUMENT_TYPE_COLORS] || DOCUMENT_TYPE_COLORS.OTHER}`}
                        >
                          {DOCUMENT_TYPE_LABELS[document.type as keyof typeof DOCUMENT_TYPE_LABELS] || document.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(document.uploadedAt)}</span>
                        </div>
                        {document.size && (
                          <div className="flex items-center gap-1">
                            <File className="h-3 w-3" />
                            <span>{formatFileSize(document.size)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(document)}
                      className="h-8 w-8 p-0"
                      title="View document"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(document)}
                      className="h-8 w-8 p-0"
                      title="Download document"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}