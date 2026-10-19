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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { PaidToggle } from '@/components/documents/paid-toggle'
import { DocumentDetailPanel } from '@/components/documents/document-detail-panel'
import { DocumentList } from '@/components/documents/document-list'
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
    <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <LandmarkIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Trésorerie & Banque
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gestion des relevés bancaires, flux financiers et rapprochement des factures impayées.
            </p>
          </div>
        </div>

        <Link
          href="/tresorerie/nouveau-document"
          className={cn(buttonVariants({ variant: 'default' }), 'gap-1.5')}
        >
          <PlusIcon className="size-4" />
          Nouveau document
        </Link>
      </div>

      {/* Métriques clés de rapprochement */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Créances clients */}
        <Card className="border border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Créances Clients (Ventes)
            </CardTitle>
            <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeftIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatDZD(totalSalesAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-foreground">{unpaidSales.length}</span>{' '}
              facture{unpaidSales.length > 1 ? 's' : ''} en attente d&apos;encaissement
            </p>
          </CardContent>
        </Card>

        {/* Dettes fournisseurs */}
        <Card className="border border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Dettes Fournisseurs (Achats)
            </CardTitle>
            <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ArrowUpRightIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatDZD(totalPurchasesAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-foreground">{unpaidPurchases.length}</span>{' '}
              facture{unpaidPurchases.length > 1 ? 's' : ''} en attente de décaissement
            </p>
          </CardContent>
        </Card>

        {/* Solde net */}
        <Card className="border border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Solde Net Prévisionnel
            </CardTitle>
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <ScaleIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                netBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {formatDZD(netBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {unpaidSales.length + unpaidPurchases.length} facture(s) impayée(s) au total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Factures Impayées & Rapprochement */}
      <section aria-labelledby="reconciliation-heading" className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 id="reconciliation-heading" className="text-lg font-bold tracking-tight text-foreground">
              Factures Impayées & Rapprochement
            </h2>
            <p className="text-xs text-muted-foreground">
              Rapprochement des créances clients et dettes fournisseurs nécessitant un règlement.
            </p>
          </div>
          <Badge variant="outline" className="text-xs w-fit">
            {outstandingDocs.length} facture{outstandingDocs.length > 1 ? 's' : ''} à rapprocher
          </Badge>
        </div>

        {loadingOutstanding ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3 border rounded-lg bg-card/40">
            <Loader2Icon className="size-7 animate-spin text-primary" />
            <p className="text-xs">Chargement des factures impayées...</p>
          </div>
        ) : outstandingError ? (
          <div className="p-6 flex items-center justify-center gap-2 text-xs text-destructive border border-dashed rounded-lg bg-destructive/5">
            <AlertCircleIcon className="size-4" />
            <span>{outstandingError}</span>
          </div>
        ) : outstandingDocs.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-lg bg-muted/10 text-muted-foreground">
            <p className="text-sm font-medium">Aucune facture impayée</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Toutes les factures clients et fournisseurs sont à jour de règlement.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
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
                        'hover:bg-muted/30 transition-colors cursor-pointer',
                        doc.isPaid && 'opacity-60 bg-muted/15'
                      )}
                      onClick={() => setSelectedDocumentId(doc.id)}
                    >
                      {/* Type de document */}
                      <TableCell className="text-xs">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] font-medium tracking-wide',
                            isClient
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                              : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                          )}
                        >
                          {typeLabel}
                        </Badge>
                      </TableCell>

                      {/* Tiers */}
                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider',
                              isClient
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
                            )}
                          >
                            {isClient ? 'Client' : 'Fournisseur'}
                          </span>
                          <span className="text-foreground truncate max-w-[180px]">{entity}</span>
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
      </section>

      {/* Section 2: Documents Bancaires & Justificatifs */}
      <section aria-labelledby="bank-documents-heading" className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border/50 pt-6">
          <div>
            <h2 id="bank-documents-heading" className="text-lg font-bold tracking-tight text-foreground">
              Documents Bancaires & Justificatifs
            </h2>
            <p className="text-xs text-muted-foreground">
              Relevés de comptes, bordereaux de versement et reçus de paiement bancaires.
            </p>
          </div>

          {/* Filtre par type de document */}
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/60 self-start sm:self-auto">
            <FilterIcon className="size-3.5 text-muted-foreground ml-1.5 shrink-0" />
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('ALL')}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                selectedTypeFilter === 'ALL'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Tous ({tresorerieDocs.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('RELEVE_BANCAIRE')}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                selectedTypeFilter === 'RELEVE_BANCAIRE'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Relevés bancaires (
              {tresorerieDocs.filter((d) => d.documentType === 'RELEVE_BANCAIRE').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('RECU_PAIEMENT')}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                selectedTypeFilter === 'RECU_PAIEMENT'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Reçus de paiement (
              {tresorerieDocs.filter((d) => d.documentType === 'RECU_PAIEMENT').length})
            </button>
          </div>
        </div>

        {loadingTresorerie ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3 border rounded-lg bg-card/40">
            <Loader2Icon className="size-7 animate-spin text-primary" />
            <p className="text-xs">Chargement des documents bancaires...</p>
          </div>
        ) : tresorerieError ? (
          <div className="p-6 flex items-center justify-center gap-2 text-xs text-destructive border border-dashed rounded-lg bg-destructive/5">
            <AlertCircleIcon className="size-4" />
            <span>{tresorerieError}</span>
          </div>
        ) : (
          <DocumentList
            documents={filteredTresorerieDocs}
            onSelect={(id) => setSelectedDocumentId(id)}
          />
        )}
      </section>

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
