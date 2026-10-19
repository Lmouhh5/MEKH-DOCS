'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { PdfViewer } from '@/components/documents/pdf-viewer'
import { PaidToggle } from '@/components/documents/paid-toggle'
import { DOCUMENT_TYPE_LABELS, MODULE_LABELS, DocumentTypeKey, ModuleKey } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CalendarIcon,
  BanknoteIcon,
  MapPinIcon,
  FileTextIcon,
  Link2Icon,
  AlertCircleIcon,
  Building2Icon,
} from 'lucide-react'

export interface DocumentDetail {
  id: string
  title: string
  documentType: string
  module: string
  issueDate: string
  dueDate?: string | null
  amount?: string | number | null
  isPaid?: boolean | null
  physicalLocation?: string | null
  notes?: string | null
  signedUrl?: string
  url?: string
  createdAt?: string
  client?: { id: string; nom: string } | null
  fournisseur?: { id: string; nom: string } | null
  machine?: { id: string; nom: string; matricule?: string } | null
  travailleur?: { id: string; nom: string; prenom?: string } | null
}

export interface DocumentDetailPanelProps {
  documentId: string | null
  isOpen?: boolean
  onClose: () => void
  onDocumentUpdated?: () => void
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-'
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

function formatAmount(amount?: string | number | null) {
  if (amount === undefined || amount === null || amount === '') return null
  const num = Number(amount)
  if (isNaN(num)) return `${amount} DZD`
  return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD`
}

export function DocumentDetailPanel({
  documentId,
  isOpen,
  onClose,
  onDocumentUpdated,
}: DocumentDetailPanelProps) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const open = isOpen !== undefined ? isOpen : Boolean(documentId)

  const fetchDocument = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${id}`)
      if (!res.ok) {
        throw new Error('Impossible de charger le document')
      }
      const data: DocumentDetail = await res.json()
      setDoc(data)
    } catch {
      setError('Erreur lors du chargement des détails du document')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (documentId && open) {
      void fetchDocument(documentId)
    } else if (!open) {
      setDoc(null)
      setError(null)
    }
  }, [documentId, open, fetchDocument])

  const isInvoice =
    doc?.isPaid != null ||
    doc?.documentType === 'FACTURE_VENTE' ||
    doc?.documentType === 'FACTURE_ACHAT'

  const entityName =
    doc?.client?.nom ||
    doc?.fournisseur?.nom ||
    doc?.machine?.nom ||
    (doc?.travailleur ? `${doc.travailleur.prenom ?? ''} ${doc.travailleur.nom}`.trim() : null)

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-0 flex flex-col gap-0 bg-background"
      >
        {loading && (
          <div className="p-6 flex flex-col gap-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-48 w-full mt-4" />
            <Skeleton className="h-64 w-full mt-4" />
          </div>
        )}

        {error && (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-2 text-destructive">
            <AlertCircleIcon className="size-8" />
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && doc && (
          <>
            <SheetHeader className="p-6 pb-4 border-b border-border/50 bg-card/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {MODULE_LABELS[doc.module as ModuleKey] || doc.module}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {DOCUMENT_TYPE_LABELS[doc.documentType as DocumentTypeKey] ||
                        doc.documentType}
                    </Badge>
                  </div>
                  <SheetTitle className="text-lg font-bold mt-1 text-foreground leading-snug">
                    {doc.title}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Document #{doc.id}
                  </SheetDescription>
                </div>

                {isInvoice && (
                  <div className="shrink-0 pt-1">
                    <PaidToggle
                      documentId={doc.id}
                      isPaid={doc.isPaid}
                      onToggle={(newStatus) => {
                        setDoc((prev) => (prev ? { ...prev, isPaid: newStatus } : null))
                        onDocumentUpdated?.()
                      }}
                    />
                  </div>
                )}
              </div>
            </SheetHeader>

            <div className="p-6 flex flex-col gap-6">
              {/* Métadonnées principales */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-muted/20 p-4 rounded-lg border border-border/40">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="size-3.5" /> {"Date d'émission"}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatDate(doc.issueDate)}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="size-3.5" /> {"Date d'échéance"}
                  </span>
                  <span
                    className={
                      doc.dueDate
                        ? 'font-semibold text-amber-600 dark:text-amber-400'
                        : 'text-muted-foreground'
                    }
                  >
                    {formatDate(doc.dueDate)}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <BanknoteIcon className="size-3.5" /> Montant
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatAmount(doc.amount) || '-'}
                  </span>
                </div>

                {entityName && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Building2Icon className="size-3.5" /> Entité liée
                    </span>
                    <span className="font-semibold text-foreground truncate">
                      {entityName}
                    </span>
                  </div>
                )}

                {doc.physicalLocation && (
                  <div className="flex flex-col gap-1 col-span-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPinIcon className="size-3.5" /> Emplacement physique
                    </span>
                    <span className="font-medium text-foreground">
                      {doc.physicalLocation}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {doc.notes && (
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <FileTextIcon className="size-3.5" /> Notes / Observations
                  </span>
                  <p className="p-3 bg-muted/15 border border-border/30 rounded text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {doc.notes}
                  </p>
                </div>
              )}

              {/* Widget de liaison (Placeholder pour Task 13) */}
              <div
                data-testid="document-link-widget-placeholder"
                className="p-4 border border-dashed rounded-lg bg-muted/10 flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Link2Icon className="size-3.5 text-primary" />
                  <span>Liens entre documents</span>
                  <Badge variant="outline" className="text-[10px] ml-auto py-0">
                    Task 13
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Le widget de liaison documentaire permettra d&apos;associer ce document à des devis, réceptions ou règlements.
                </p>
              </div>

              <Separator />

              {/* Visionneuse PDF */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aperçu du document PDF
                </h3>
                <div className="h-[550px] w-full rounded-lg overflow-hidden border border-border/50 shadow-sm">
                  <PdfViewer
                    documentId={doc.id}
                    initialUrl={doc.signedUrl || doc.url || ''}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
