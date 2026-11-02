'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
import { PaidToggle } from '@/components/documents/paid-toggle'
import { DocumentDetailPanel } from '@/components/documents/document-detail-panel'
import { DocumentList } from '@/components/documents/document-list'
import {
  RibbonEmpty,
  RibbonKpiStrip,
  RibbonMetaChip,
  RibbonSeg,
  RibbonSegButton,
  RibbonWidget,
} from '@/components/dashboard/ribbon-widget'
import { DOCUMENT_TYPE_LABELS, DocumentTypeKey } from '@/lib/constants'
import { DocumentSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  LandmarkIcon,
  PlusIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ScaleIcon,
  FileTextIcon,
  FilterIcon,
  Loader2Icon,
  AlertCircleIcon,
} from 'lucide-react'

export interface OutstandingInvoice {
  id: string
  title: string
  documentType: string
  module: string
  issueDate: string
  dueDate?: string | null
  amount?: number | null
  formattedAmount?: string
  isPaid?: boolean | null
  entityName?: string
  client?: { id: string; nom: string } | null
  fournisseur?: { id: string; nom: string } | null
  signedUrl?: string
  url?: string
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

function formatDZD(amount: number) {
  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DZD`
}

interface RawTresorerieDoc {
  id: string
  title: string
  documentType: string
  module: string
  issueDate: string | Date
  dueDate?: string | Date | null
  amount?: number | string | null
  isPaid?: boolean | null
  entityName?: string
}

export default function TresoreriePage() {
  const [outstandingDocs, setOutstandingDocs] = useState<OutstandingInvoice[]>([])
  const [loadingOutstanding, setLoadingOutstanding] = useState<boolean>(true)
  const [outstandingError, setOutstandingError] = useState<string | null>(null)

  const [tresorerieDocs, setTresorerieDocs] = useState<DocumentSummary[]>([])
  const [loadingTresorerie, setLoadingTresorerie] = useState<boolean>(true)
  const [tresorerieError, setTresorerieError] = useState<string | null>(null)

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL')
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)

  const fetchOutstanding = useCallback(async () => {
    setLoadingOutstanding(true)
    setOutstandingError(null)
    try {
      const res = await fetch('/api/dashboard/outstanding')
      if (!res.ok) {
        throw new Error('Erreur lors du chargement des factures impayées')
      }
      const data: OutstandingInvoice[] = await res.json()
      setOutstandingDocs(data)
    } catch {
      setOutstandingError('Impossible de charger les factures impayées')
    } finally {
      setLoadingOutstanding(false)
    }
  }, [])

  const fetchTresorerieDocs = useCallback(async () => {
    setLoadingTresorerie(true)
    setTresorerieError(null)
    try {
      const res = await fetch('/api/documents?module=TRESORERIE')
      if (!res.ok) {
        throw new Error('Erreur lors du chargement des documents de trésorerie')
      }
      const data = await res.json()
      const formatted: DocumentSummary[] = data.map((d: RawTresorerieDoc) => ({
        id: d.id,
        title: d.title,
        documentType: d.documentType,
        module: d.module,
        issueDate:
          typeof d.issueDate === 'string'
            ? d.issueDate
            : new Date(d.issueDate).toISOString(),
        dueDate: d.dueDate
          ? typeof d.dueDate === 'string'
            ? d.dueDate
            : new Date(d.dueDate).toISOString()
          : undefined,
        amount: d.amount != null ? Number(d.amount) : undefined,
        isPaid: d.isPaid != null ? Boolean(d.isPaid) : undefined,
        entityName: d.entityName,
      }))
      setTresorerieDocs(formatted)
    } catch {
      setTresorerieError('Impossible de charger les documents bancaires')
    } finally {
      setLoadingTresorerie(false)
    }
  }, [])

  useEffect(() => {
    void fetchOutstanding()
    void fetchTresorerieDocs()
  }, [fetchOutstanding, fetchTresorerieDocs])

  const handlePaidToggle = (docId: string, newStatus: boolean) => {
    setOutstandingDocs((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, isPaid: newStatus } : doc))
    )
  }

  // Calcul des métriques sur les factures impayées
  const unpaidSales = outstandingDocs.filter(
    (d) => (d.module === 'CLIENTS' || d.documentType === 'FACTURE_VENTE') && !d.isPaid
  )
  const totalSalesAmount = unpaidSales.reduce(
    (acc, d) => acc + (d.amount != null ? Number(d.amount) : 0),
    0
  )

  const unpaidPurchases = outstandingDocs.filter(
    (d) => (d.module === 'FOURNISSEURS' || d.documentType === 'FACTURE_ACHAT') && !d.isPaid
  )
  const totalPurchasesAmount = unpaidPurchases.reduce(
    (acc, d) => acc + (d.amount != null ? Number(d.amount) : 0),
    0
  )

  const netBalance = totalSalesAmount - totalPurchasesAmount

  // Filtrage des documents de trésorerie
  const filteredTresorerieDocs = tresorerieDocs.filter((doc) => {
    if (selectedTypeFilter === 'ALL') return true
    return doc.documentType === selectedTypeFilter
  })

  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-rule pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink">
            Trésorerie & Banque
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Gestion des relevés bancaires, flux financiers et rapprochement des factures impayées.
          </p>
        </div>

        <Link
          href="/tresorerie/nouveau-document"
          className={cn(buttonVariants({ variant: 'default' }), 'gap-1.5')}
        >
          <PlusIcon className="size-4" />
          Nouveau document
        </Link>
      </div>

      <RibbonKpiStrip
        items={[
          {
            label: 'Créances Clients (Ventes)',
            value: formatDZD(totalSalesAmount),
            icon: <ArrowDownLeftIcon className="size-4" />,
            hint: (
              <>
                <span className="font-medium text-ink tabular-nums">{unpaidSales.length}</span>{' '}
                facture{unpaidSales.length > 1 ? 's' : ''} en attente d&apos;encaissement
              </>
            ),
          },
          {
            label: 'Dettes Fournisseurs (Achats)',
            value: formatDZD(totalPurchasesAmount),
            icon: <ArrowUpRightIcon className="size-4" />,
            hint: (
              <>
                <span className="font-medium text-ink tabular-nums">{unpaidPurchases.length}</span>{' '}
                facture{unpaidPurchases.length > 1 ? 's' : ''} en attente de décaissement
              </>
            ),
          },
          {
            label: 'Solde Net Prévisionnel',
            value: formatDZD(netBalance),
            icon: <ScaleIcon className="size-4" />,
            tone: netBalance < 0 ? 'warn' : 'default',
            hint: `${unpaidSales.length + unpaidPurchases.length} facture(s) impayée(s) au total`,
          },
        ]}
      />

      <RibbonWidget
        index={1}
        title="Factures Impayées & Rapprochement"
        description="Rapprochement des créances clients et dettes fournisseurs nécessitant un règlement."
        icon={<FileTextIcon className="size-4" />}
        meta={
          <RibbonMetaChip lit={outstandingDocs.length > 0}>
            {outstandingDocs.length} facture{outstandingDocs.length > 1 ? 's' : ''} à rapprocher
          </RibbonMetaChip>
        }
      >
        {loadingOutstanding ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
            <Loader2Icon className="size-7 motion-safe:animate-spin text-primary" />
            <p className="text-sm">Chargement des factures impayées…</p>
          </div>
        ) : outstandingError ? (
          <div className="p-6 flex items-center justify-center gap-2 text-sm text-destructive">
            <AlertCircleIcon className="size-4" />
            <span>{outstandingError}</span>
          </div>
        ) : outstandingDocs.length === 0 ? (
          <RibbonEmpty
            title="Aucune facture impayée"
            description="Toutes les factures clients et fournisseurs sont à jour de règlement."
            meters={[
              { label: 'Clients', level: 0 },
              { label: 'Fournisseurs', level: 0 },
              { label: 'Solde', level: 0 },
            ]}
          />
        ) : (
          <div className="overflow-x-auto rounded-part">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-semibold text-xs">Type de document</TableHead>
                  <TableHead className="font-semibold text-xs">Tiers (Client / Fournisseur)</TableHead>
                  <TableHead className="font-semibold text-xs">Titre</TableHead>
                  <TableHead className="font-semibold text-xs">Date d&apos;émission</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Montant (DZD)</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Règlement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstandingDocs.map((doc) => {
                  const typeLabel =
                    DOCUMENT_TYPE_LABELS[doc.documentType as DocumentTypeKey] ||
                    doc.documentType
                  const entity = doc.entityName || doc.client?.nom || doc.fournisseur?.nom || '—'
                  const isClient = doc.module === 'CLIENTS'

                  return (
                    <TableRow
                      key={doc.id}
                      className={cn(
                        'border-rule hover:bg-paper-3/50 transition-colors duration-micro cursor-pointer',
                        doc.isPaid && 'opacity-60'
                      )}
                      onClick={() => setSelectedDocumentId(doc.id)}
                    >
                      <TableCell className="text-[13px]">
                        <RibbonMetaChip lit={isClient}>{typeLabel}</RibbonMetaChip>
                      </TableCell>

                      <TableCell className="text-[13px] font-medium">
                        <div className="flex items-center gap-1.5">
                          <RibbonMetaChip lit={isClient}>
                            {isClient ? 'Client' : 'Fournisseur'}
                          </RibbonMetaChip>
                          <span className="text-ink truncate max-w-[180px]">{entity}</span>
                        </div>
                      </TableCell>

                      {/* Titre */}
                      <TableCell className="text-xs font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <FileTextIcon className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="hover:underline">{doc.title}</span>
                        </div>
                      </TableCell>

                      {/* Date d'émission */}
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(doc.issueDate)}
                      </TableCell>

                      {/* Montant */}
                      <TableCell className="text-xs font-semibold text-right text-foreground">
                        {doc.amount != null ? formatDZD(Number(doc.amount)) : doc.formattedAmount || '—'}
                      </TableCell>

                      {/* Règlement (PaidToggle) */}
                      <TableCell
                        className="text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center">
                          <PaidToggle
                            documentId={doc.id}
                            isPaid={doc.isPaid}
                            onToggle={(newStatus) => handlePaidToggle(doc.id, newStatus)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </RibbonWidget>

      <RibbonWidget
        index={2}
        title="Documents Bancaires & Justificatifs"
        description="Relevés de comptes, bordereaux de versement et reçus de paiement bancaires."
        icon={<LandmarkIcon className="size-4" />}
        action={
          <RibbonSeg>
            <FilterIcon className="size-3.5 text-muted-foreground ml-2 shrink-0" />
            <RibbonSegButton
              active={selectedTypeFilter === 'ALL'}
              onClick={() => setSelectedTypeFilter('ALL')}
            >
              Tous ({tresorerieDocs.length})
            </RibbonSegButton>
            <RibbonSegButton
              active={selectedTypeFilter === 'RELEVE_BANCAIRE'}
              onClick={() => setSelectedTypeFilter('RELEVE_BANCAIRE')}
            >
              Relevés bancaires (
              {tresorerieDocs.filter((d) => d.documentType === 'RELEVE_BANCAIRE').length})
            </RibbonSegButton>
            <RibbonSegButton
              active={selectedTypeFilter === 'RECU_PAIEMENT'}
              onClick={() => setSelectedTypeFilter('RECU_PAIEMENT')}
            >
              Reçus de paiement (
              {tresorerieDocs.filter((d) => d.documentType === 'RECU_PAIEMENT').length})
            </RibbonSegButton>
          </RibbonSeg>
        }
      >
        {loadingTresorerie ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
            <Loader2Icon className="size-7 motion-safe:animate-spin text-primary" />
            <p className="text-sm">Chargement des documents bancaires…</p>
          </div>
        ) : tresorerieError ? (
          <div className="p-6 flex items-center justify-center gap-2 text-sm text-destructive">
            <AlertCircleIcon className="size-4" />
            <span>{tresorerieError}</span>
          </div>
        ) : (
          <DocumentList
            documents={filteredTresorerieDocs}
            onSelect={(id) => setSelectedDocumentId(id)}
          />
        )}
      </RibbonWidget>

      {/* Panneau de détails du document */}
      <DocumentDetailPanel
        documentId={selectedDocumentId}
        isOpen={Boolean(selectedDocumentId)}
        onClose={() => setSelectedDocumentId(null)}
        onDocumentUpdated={() => {
          void fetchOutstanding()
          void fetchTresorerieDocs()
        }}
      />
    </div>
  )
}
