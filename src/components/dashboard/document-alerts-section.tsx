'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DocumentAlert } from '@/lib/deadlines'
import { DOCUMENT_TYPE_LABELS, DocumentTypeKey } from '@/lib/constants'
import { DocumentDetailPanel } from '@/components/documents/document-detail-panel'
import { cn } from '@/lib/utils'
import { FileWarningIcon, CalendarIcon, Building2Icon, CheckCircle2Icon } from 'lucide-react'

export interface DocumentAlertsSectionProps {
  alerts: DocumentAlert[]
  onDocumentUpdated?: () => void
  className?: string
}

function formatDate(dateStr: Date | string) {
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function DocumentAlertsSection({
  alerts,
  onDocumentUpdated,
  className,
}: DocumentAlertsSectionProps) {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime()
      const dateB = new Date(b.dueDate).getTime()
      return dateA - dateB
    })
  }, [alerts])

  return (
    <Card className={cn('border border-border/70 shadow-sm bg-card', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <FileWarningIcon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Échéances Documentaires
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assurances, contrôles techniques, contrats et pièces expirant prochainement
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {sortedAlerts.length} document{sortedAlerts.length > 1 ? 's' : ''}
        </Badge>
      </CardHeader>

      <CardContent className="pt-2">
        {sortedAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-border/60 bg-muted/10 text-muted-foreground">
            <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
              <CheckCircle2Icon className="size-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Aucun document n&apos;arrive à échéance prochainement
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Tous les documents avec date d&apos;expiration sont valides et hors seuil d&apos;alerte.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50 rounded-lg border border-border/60 overflow-hidden bg-card">
            {sortedAlerts.map((item) => {
              const isOverdue = item.severity === 'overdue'
              const isRed = item.severity === 'red'
              const typeLabel =
                DOCUMENT_TYPE_LABELS[item.documentType as DocumentTypeKey] || item.documentType

              return (
                <div
                  key={item.documentId}
                  data-testid={`document-alert-item-${item.documentId}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDocumentId(item.documentId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedDocumentId(item.documentId)
                    }
                  }}
                  className={cn(
                    'p-3.5 hover:bg-muted/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none',
                    isOverdue || isRed
                      ? 'border-l-4 border-l-red-600 bg-red-500/5'
                      : 'border-l-4 border-l-amber-600 bg-amber-500/5'
                  )}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {item.title}
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                        {typeLabel}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {item.entityName && (
                        <span className="flex items-center gap-1 truncate font-medium text-foreground/80">
                          <Building2Icon className="size-3.5" />
                          {item.entityName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="size-3.5" />
                        Échéance : {formatDate(item.dueDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                    {isOverdue && (
                      <Badge
                        variant="destructive"
                        className="text-[11px] font-bold uppercase tracking-wider bg-red-600 text-white"
                      >
                        En retard
                      </Badge>
                    )}
                    {isRed && (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-bold uppercase tracking-wider border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
                      >
                        Urgent
                      </Badge>
                    )}
                    {!isOverdue && !isRed && (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-bold uppercase tracking-wider border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      >
                        Attention
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Détails du document sélectionné */}
      <DocumentDetailPanel
        documentId={selectedDocumentId}
        isOpen={Boolean(selectedDocumentId)}
        onClose={() => setSelectedDocumentId(null)}
        onDocumentUpdated={onDocumentUpdated}
      />
    </Card>
  )
}
