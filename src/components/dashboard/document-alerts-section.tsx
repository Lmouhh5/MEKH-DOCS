'use client'

import React, { useState, useMemo } from 'react'
import { DocumentAlert } from '@/lib/deadlines'
import { DOCUMENT_TYPE_LABELS, DocumentTypeKey } from '@/lib/constants'
import { DocumentDetailPanel } from '@/components/documents/document-detail-panel'
import { RibbonEmpty, RibbonMetaChip, RibbonWidget } from '@/components/dashboard/ribbon-widget'
import { cn } from '@/lib/utils'
import { FileWarningIcon, CalendarIcon, Building2Icon } from 'lucide-react'

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
    <>
      <RibbonWidget
        index={1}
        className={className}
        title="Échéances Documentaires"
        description="Assurances, contrôles techniques, contrats et pièces expirant prochainement"
        icon={<FileWarningIcon className="size-4" />}
        meta={
          <RibbonMetaChip lit={sortedAlerts.length > 0} warn={sortedAlerts.some((a) => a.severity === 'red' || a.severity === 'overdue')}>
            {sortedAlerts.length} document{sortedAlerts.length > 1 ? 's' : ''}
          </RibbonMetaChip>
        }
      >
        {sortedAlerts.length === 0 ? (
          <RibbonEmpty
            title="Aucun document n'arrive à échéance prochainement"
            description="Tous les documents avec date d'expiration sont valides et hors seuil d'alerte."
            meters={[
              { label: 'Retard', level: 0 },
              { label: 'Urgent', level: 0 },
              { label: 'Attention', level: 0 },
            ]}
          />
        ) : (
          <ul className="m-0 p-0 list-none">
            {sortedAlerts.map((item, i) => {
              const isOverdue = item.severity === 'overdue'
              const isRed = item.severity === 'red'
              const typeLabel =
                DOCUMENT_TYPE_LABELS[item.documentType as DocumentTypeKey] || item.documentType

              return (
                <li
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
                    'ribbon-row ribbon-widget',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
                  )}
                  style={{ ['--i' as string]: i }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-display font-medium text-sm text-ink truncate">
                        {item.title}
                      </span>
                      <RibbonMetaChip>{typeLabel}</RibbonMetaChip>
                    </div>
                    {isOverdue ? (
                      <RibbonMetaChip warn>En retard</RibbonMetaChip>
                    ) : isRed ? (
                      <RibbonMetaChip warn>Urgent</RibbonMetaChip>
                    ) : (
                      <RibbonMetaChip lit>Attention</RibbonMetaChip>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
                    {item.entityName && (
                      <span className="flex items-center gap-1 truncate text-ink-2">
                        <Building2Icon className="size-3.5 shrink-0" />
                        {item.entityName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="size-3.5 shrink-0" />
                      Échéance : {formatDate(item.dueDate)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </RibbonWidget>

      <DocumentDetailPanel
        documentId={selectedDocumentId}
        isOpen={Boolean(selectedDocumentId)}
        onClose={() => setSelectedDocumentId(null)}
        onDocumentUpdated={onDocumentUpdated}
      />
    </>
  )
}
