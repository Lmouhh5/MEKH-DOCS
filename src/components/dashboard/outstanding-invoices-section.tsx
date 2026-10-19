'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { PaidToggle } from '@/components/documents/paid-toggle'
import { DocumentDetailPanel } from '@/components/documents/document-detail-panel'
import { DOCUMENT_TYPE_LABELS, DocumentTypeKey } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  BanknoteIcon,
  CheckCircle2Icon,
  Building2Icon,
  CalendarIcon,
  ExternalLinkIcon,
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
  signedUrl?: string
  url?: string
}

export interface OutstandingInvoicesSectionProps {
  invoices?: OutstandingInvoice[]
  onInvoiceUpdated?: () => void
  className?: string
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

export function OutstandingInvoicesSection({
  invoices = [],
  onInvoiceUpdated,
  className,
}: OutstandingInvoicesSectionProps) {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)

  const unpaidInvoices = useMemo(() => {
    return invoices.filter((inv) => !inv.isPaid)
  }, [invoices])

  const totalAmount = useMemo(() => {
    return unpaidInvoices.reduce((acc, inv) => acc + (inv.amount || 0), 0)
  }, [unpaidInvoices])

  return (
    <Card className={cn('border border-border/70 shadow-sm bg-card', className)}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <BanknoteIcon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Factures Impayées & En-cours
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Suivi des créances clients et dettes fournisseurs à régulariser
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {unpaidInvoices.length} facture{unpaidInvoices.length > 1 ? 's' : ''}
          </Badge>
          {totalAmount > 0 && (
            <div className="text-right">
              <span className="text-xs text-muted-foreground block leading-none">Total impayé</span>
              <span className="text-sm font-bold text-foreground">
                {formatDZD(totalAmount)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {unpaidInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-border/60 bg-muted/10 text-muted-foreground">
            <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
              <CheckCircle2Icon className="size-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Aucune facture impayée
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Toutes les factures de vente et d&apos;achat sont actuellement réglées.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Entité liée</TableHead>
                  <TableHead className="text-xs font-semibold">Document</TableHead>
                  <TableHead className="text-xs font-semibold">Date d&apos;émission</TableHead>
                  <TableHead className="text-xs font-semibold">Échéance</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Montant</TableHead>
                  <TableHead className="text-xs font-semibold text-center w-36">Statut paiement</TableHead>
                  <TableHead className="text-xs font-semibold w-12 text-center" aria-label="Action"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidInvoices.map((inv) => {
                  const typeLabel =
                    DOCUMENT_TYPE_LABELS[inv.documentType as DocumentTypeKey] || inv.documentType

                  return (
                    <TableRow
                      key={inv.id}
                      data-testid={`outstanding-invoice-row-${inv.id}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-semibold text-xs text-foreground">
                        <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                          <Building2Icon className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{inv.entityName || 'Non spécifié'}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground truncate max-w-[200px]">
                            {inv.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{typeLabel}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="size-3" />
                          {formatDate(inv.issueDate)}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs whitespace-nowrap">
                        <span
                          className={
                            inv.dueDate
                              ? 'text-amber-600 dark:text-amber-400 font-medium'
                              : 'text-muted-foreground'
                          }
                        >
                          {formatDate(inv.dueDate)}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs font-bold text-right text-foreground whitespace-nowrap">
                        {inv.amount != null ? formatDZD(inv.amount) : inv.formattedAmount || '-'}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <PaidToggle
                            documentId={inv.id}
                            isPaid={inv.isPaid}
                            onToggle={() => {
                              onInvoiceUpdated?.()
                            }}
                          />
                        </div>
                      </TableCell>

                      <TableCell className="text-center p-1">
                        <button
                          type="button"
                          onClick={() => setSelectedDocumentId(inv.id)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Voir les détails"
                          aria-label={`Détails du document ${inv.title}`}
                        >
                          <ExternalLinkIcon className="size-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Détails du document sélectionné */}
      <DocumentDetailPanel
        documentId={selectedDocumentId}
        isOpen={Boolean(selectedDocumentId)}
        onClose={() => setSelectedDocumentId(null)}
        onDocumentUpdated={onInvoiceUpdated}
      />
    </Card>
  )
}
