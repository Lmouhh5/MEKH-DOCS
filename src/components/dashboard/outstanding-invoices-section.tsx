'use client'

import React, { useMemo, useState } from 'react'
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
import { RibbonEmpty, RibbonMetaChip, RibbonWidget } from '@/components/dashboard/ribbon-widget'
import { DOCUMENT_TYPE_LABELS, DocumentTypeKey } from '@/lib/constants'
import {
  BanknoteIcon,
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
    <>
      <RibbonWidget
        index={2}
        className={className}
        title="Factures Impayées & En-cours"
        description="Suivi des créances clients et dettes fournisseurs à régulariser"
        icon={<BanknoteIcon className="size-4" />}
        meta={
          <div className="flex items-center gap-2">
            <RibbonMetaChip lit={unpaidInvoices.length > 0}>
              {unpaidInvoices.length} facture{unpaidInvoices.length > 1 ? 's' : ''}
            </RibbonMetaChip>
            {totalAmount > 0 ? (
              <span className="font-display text-sm tabular-nums text-primary tracking-tight">
                {formatDZD(totalAmount)}
              </span>
            ) : null}
          </div>
        }
      >
        {unpaidInvoices.length === 0 ? (
          <RibbonEmpty
            title="Aucune facture impayée"
            description="Toutes les factures de vente et d'achat sont actuellement réglées."
            meters={[
              { label: 'Clients', level: 0 },
              { label: 'Fournisseurs', level: 0 },
              { label: 'En cours', level: 0 },
            ]}
          />
        ) : (
          <div className="overflow-x-auto rounded-part">
            <Table>
              <TableHeader>
                <TableRow className="border-rule hover:bg-transparent">
                  <TableHead className="text-[13px] font-medium text-muted-foreground">
                    Entité liée
                  </TableHead>
                  <TableHead className="text-[13px] font-medium text-muted-foreground">
                    Document
                  </TableHead>
                  <TableHead className="text-[13px] font-medium text-muted-foreground">
                    Date d&apos;émission
                  </TableHead>
                  <TableHead className="text-[13px] font-medium text-muted-foreground">
                    Échéance
                  </TableHead>
                  <TableHead className="text-[13px] font-medium text-muted-foreground text-right">
                    Montant
                  </TableHead>
                  <TableHead className="text-[13px] font-medium text-muted-foreground text-center w-36">
                    Statut paiement
                  </TableHead>
                  <TableHead
                    className="text-[13px] font-medium text-muted-foreground w-12 text-center"
                    aria-label="Action"
                  />
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
                      className="border-rule hover:bg-paper-3/50 transition-colors duration-micro"
                    >
                      <TableCell className="font-medium text-[13px] text-ink">
                        <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                          <Building2Icon className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{inv.entityName || 'Non spécifié'}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-[13px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-ink truncate max-w-[200px]">
                            {inv.title}
                          </span>
                          <span className="text-[12px] text-muted-foreground">{typeLabel}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-[13px] text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="size-3" />
                          {formatDate(inv.issueDate)}
                        </div>
                      </TableCell>

                      <TableCell className="text-[13px] whitespace-nowrap">
                        <span
                          className={
                            inv.dueDate ? 'text-primary font-medium' : 'text-muted-foreground'
                          }
                        >
                          {formatDate(inv.dueDate)}
                        </span>
                      </TableCell>

                      <TableCell className="text-[13px] font-display font-medium tabular-nums text-right text-ink whitespace-nowrap">
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
                          className="p-1.5 rounded-part hover:bg-paper-3 text-muted-foreground hover:text-ink transition-colors duration-micro focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
      </RibbonWidget>

      <DocumentDetailPanel
        documentId={selectedDocumentId}
        isOpen={Boolean(selectedDocumentId)}
        onClose={() => setSelectedDocumentId(null)}
        onDocumentUpdated={onInvoiceUpdated}
      />
    </>
  )
}
