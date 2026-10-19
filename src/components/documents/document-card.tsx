'use client'

import React from 'react'
import { DocumentSummary } from '@/lib/types'
import { DOCUMENT_TYPE_LABELS, DocumentTypeKey } from '@/lib/constants'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, BanknoteIcon, FileTextIcon, UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DocumentCardProps {
  document: DocumentSummary
  onSelect?: (id: string) => void
  className?: string
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatAmount(amount?: number | null) {
  if (amount === undefined || amount === null) return null
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD`
}

export function DocumentCard({
  document,
  onSelect,
  className,
}: DocumentCardProps) {
  const typeLabel =
    DOCUMENT_TYPE_LABELS[document.documentType as DocumentTypeKey] ||
    document.documentType

  const formattedIssueDate = formatDate(document.issueDate)
  const formattedDueDate = formatDate(document.dueDate)
  const formattedAmount = formatAmount(document.amount)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.(document.id)
    }
  }

  return (
    <Card
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(document.id)}
      onKeyDown={handleKeyDown}
      className={cn(
        'group transition-all duration-200 hover:shadow-md border border-border/60 bg-card text-card-foreground',
        onSelect && 'cursor-pointer hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <FileTextIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold truncate leading-tight">
              {document.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {typeLabel}
            </p>
          </div>
        </div>

        {document.isPaid !== undefined && document.isPaid !== null && (
          <Badge
            variant={document.isPaid ? 'default' : 'destructive'}
            className={cn(
              'shrink-0 text-[10px] font-medium tracking-wide uppercase',
              document.isPaid
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
            )}
          >
            {document.isPaid ? 'Payé' : 'Impayé'}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-2 flex flex-col gap-2 text-xs text-muted-foreground">
        {document.entityName && (
          <div className="flex items-center gap-1.5 text-foreground/80 font-medium truncate">
            <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{document.entityName}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 pt-1 border-t border-border/40">
          {formattedIssueDate && (
            <div className="flex items-center gap-1">
              <CalendarIcon className="size-3 shrink-0" />
              <span>Émis: {formattedIssueDate}</span>
            </div>
          )}

          {formattedDueDate && (
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <CalendarIcon className="size-3 shrink-0" />
              <span>Échéance: {formattedDueDate}</span>
            </div>
          )}

          {formattedAmount && (
            <div className="flex items-center gap-1 ml-auto text-foreground font-semibold">
              <BanknoteIcon className="size-3.5 shrink-0 text-primary" />
              <span>{formattedAmount}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
