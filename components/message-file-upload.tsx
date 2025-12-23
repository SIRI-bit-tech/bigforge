"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Paperclip, X, FileText, Image, Video, Download } from "lucide-react"
import { MessageAttachment } from "@/lib/types"

interface MessageFileUploadProps {
  onFileSelect: (files: File[]) => void
  selectedFiles: File[]
  onRemoveFile: (index: number) => void
  disabled?: boolean
}

interface AttachmentDisplayProps {
  attachments: MessageAttachment[]
  onDownload: (attachment: MessageAttachment) => void
}

export function MessageFileUpload({ 
  onFileSelect, 
  selectedFiles, 
  onRemoveFile, 
  disabled = false 
}: MessageFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate file sizes (max 10MB per file)
    const maxSize = 10 * 1024 * 1024 // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize)
    
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: `Files must be smaller than 10MB. ${oversizedFiles.length} file(s) were skipped.`,
        variant: "destructive",
      })
    }
    
    const validFiles = files.filter(file => file.size <= maxSize)
    
    // Limit total files (max 5 files per message)
    const totalFiles = selectedFiles.length + validFiles.length
    if (totalFiles > 5) {
      toast({
        title: "Too many files",
        description: "You can attach a maximum of 5 files per message.",
        variant: "destructive",
      })
      return
    }
    
    if (validFiles.length > 0) {
      onFileSelect(validFiles)
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-2">
      {/* File Input */}
      <div className="flex items-center gap-2">
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || selectedFiles.length >= 5}
        >
          <Paperclip className="h-4 w-4 mr-2" />
          Attach Files
        </Button>
        <span className="text-xs text-muted-foreground">
          Max 5 files, 10MB each
        </span>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 p-2 bg-muted rounded-lg"
            >
              {getFileIcon(file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFile(index)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AttachmentDisplay({ attachments, onDownload }: AttachmentDisplayProps) {
  if (!attachments || attachments.length === 0) return null

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />
    if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border"
        >
          {getFileIcon(attachment.fileType)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.originalName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.fileSize)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDownload(attachment)}
            title="Download file"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}