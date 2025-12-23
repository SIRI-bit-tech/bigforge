import Link from "next/link"
import { formatCurrency, formatDateTime } from "@/lib/utils/format"
import { StatusBadge } from "./status-badge"
import type { Bid, Company, Project } from "@/lib/types"
import { Button } from "./ui/button"

interface BidCardProps {
  bid: Bid
  company?: Company
  project?: Project
  showProject?: boolean
  showActions?: boolean
}

export function BidCard({ bid, company, project, showProject = false, showActions = true }: BidCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {showProject && project && (
            <Link
              href={`/projects/${project.id}`}
              className="text-sm text-muted-foreground hover:text-primary mb-1 block"
            >
              {project.title}
            </Link>
          )}
          {company && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold text-sm">
                {company.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-foreground">{company.name}</div>
                <div className="text-sm text-muted-foreground">{company.type}</div>
              </div>
            </div>
          )}
        </div>
        <StatusBadge status={bid.status} />
      </div>

      <div className="mb-4">
        <div className="text-2xl font-bold text-foreground">{formatCurrency(bid.totalAmount)}</div>
        <div className="text-sm text-muted-foreground">
          {bid.lineItems?.length || 0} line items • {bid.alternates?.length || 0} alternates
        </div>
      </div>

      {bid.notes && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{bid.notes}</p>}

      {showActions && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground">
            {bid.submittedAt ? `Submitted ${formatDateTime(bid.submittedAt)}` : "Draft"}
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href={`/projects/${bid.projectId}/bids/${bid.id}`}>View Details</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
