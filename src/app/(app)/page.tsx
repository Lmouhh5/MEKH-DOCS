'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { CalendarAlertsSection } from '@/components/dashboard/calendar-alerts-section'
import { DocumentAlertsSection } from '@/components/dashboard/document-alerts-section'
import {
  ManualDeadlineForm,
  ManualDeadlineItem,
} from '@/components/dashboard/manual-deadline-form'
import {
  OutstandingInvoicesSection,
  OutstandingInvoice,
} from '@/components/dashboard/outstanding-invoices-section'
import { CalendarAlert, DocumentAlert, ManualAlert } from '@/lib/deadlines'
import {
  AlertTriangleIcon,
  BanknoteIcon,
  CalendarClockIcon,
  RefreshCwIcon,
  Loader2Icon,
  AlertCircleIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeadlinesApiResponse {
  calendarAlerts: CalendarAlert[]
  documentAlerts: DocumentAlert[]
  manualAlerts: ManualAlert[]
}

function formatDZD(amount: number) {
  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DZD`
}

export default function DashboardPage() {
  const [calendarAlerts, setCalendarAlerts] = useState<CalendarAlert[]>([])
  const [documentAlerts, setDocumentAlerts] = useState<DocumentAlert[]>([])
  const [manualAlerts, setManualAlerts] = useState<ManualAlert[]>([])
  const [manualDeadlines, setManualDeadlines] = useState<ManualDeadlineItem[]>([])
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)

    try {
      const [deadlinesRes, outstandingRes, manualRes] = await Promise.all([
        fetch('/api/dashboard/deadlines'),
        fetch('/api/dashboard/outstanding'),
        fetch('/api/dashboard/manual-deadlines'),
      ])

      if (!deadlinesRes.ok) {
        throw new Error('Erreur lors du chargement des échéances')
      }
      if (!outstandingRes.ok) {
        throw new Error('Erreur lors du chargement des factures impayées')
      }
      if (!manualRes.ok) {
        throw new Error('Erreur lors du chargement des échéances manuelles')
      }

      const deadlinesData: DeadlinesApiResponse = await deadlinesRes.json()
      const outstandingData: OutstandingInvoice[] = await outstandingRes.json()
      const manualData: ManualDeadlineItem[] = await manualRes.json()

      setCalendarAlerts(deadlinesData.calendarAlerts || [])
      setDocumentAlerts(deadlinesData.documentAlerts || [])
      setManualAlerts(deadlinesData.manualAlerts || [])
      setOutstandingInvoices(outstandingData || [])
      setManualDeadlines(manualData || [])
    } catch {
      setError('Impossible de charger les données du tableau de bord. Veuillez réessayer.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchDashboardData()
  }, [fetchDashboardData])

  const urgentAlertsCount = useMemo(() => {
    const redCalendar = calendarAlerts.filter((a) => a.severity === 'red').length
    const redOrOverdueDocs = documentAlerts.filter(
      (a) => a.severity === 'red' || a.severity === 'overdue'
    ).length
    const redOrOverdueManual = manualAlerts.filter(
      (a) => a.severity === 'red' || a.severity === 'overdue'
    ).length
    return redCalendar + redOrOverdueDocs + redOrOverdueManual
  }, [calendarAlerts, documentAlerts, manualAlerts])

  const unpaidMetrics = useMemo(() => {
    const unpaid = outstandingInvoices.filter((inv) => !inv.isPaid)
    const totalAmount = unpaid.reduce((sum, inv) => sum + (inv.amount || 0), 0)
    return {
      count: unpaid.length,
      totalAmount,
    }
  }, [outstandingInvoices])

  const upcomingDeadlinesCount = useMemo(() => {
    return calendarAlerts.length + documentAlerts.length + manualDeadlines.length
  }, [calendarAlerts, documentAlerts, manualDeadlines])

  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-rule pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink">
            Tableau de Suivi des Échéances
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Pilotage centralisé des alertes réglementaires, expirations documentaires et factures
            impayées.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void fetchDashboardData(true)}
          disabled={loading || refreshing}
          className="gap-1.5 self-start sm:self-auto"
          data-testid="refresh-dashboard-btn"
        >
          <RefreshCwIcon
            className={`size-3.5 ${refreshing ? 'motion-safe:animate-spin' : ''}`}
          />
          Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-3 ribbon-panel">
          <Loader2Icon className="size-8 text-primary motion-safe:animate-spin" />
          <p className="text-sm font-medium">Chargement du tableau de bord…</p>
        </div>
      ) : error ? (
        <div className="p-6 flex flex-wrap items-center justify-center gap-2 text-sm text-destructive border border-dashed border-destructive/40 rounded-card bg-destructive/5">
          <AlertCircleIcon className="size-5" />
          <span>{error}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void fetchDashboardData()}
            className="ml-2 text-xs underline"
          >
            Réessayer
          </Button>
        </div>
      ) : (
        <>
          <section
            aria-label="Indicateurs clés"
            className="ribbon-panel ribbon-grain overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3">
              <div
                data-testid="kpi-urgent-alerts"
                className="flex flex-col gap-3 p-5 sm:border-r border-rule border-b sm:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-muted-foreground">
                    Alertes urgentes
                  </span>
                  <AlertTriangleIcon
                    className={`size-4 shrink-0 ${
                      urgentAlertsCount > 0 ? 'text-destructive' : 'text-primary'
                    }`}
                  />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-normal tabular-nums text-ink tracking-tight">
                    {urgentAlertsCount}
                  </span>
                  {urgentAlertsCount > 0 ? (
                    <Badge variant="destructive" className="text-[11px] px-1.5 py-0">
                      Action requise
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 text-primary border-primary/30">
                      À jour
                    </Badge>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground">
                  Échéances critiques dépassées ou imminentes (≤ 7 jours).
                </p>
              </div>

              <div
                data-testid="kpi-outstanding-invoices"
                className="flex flex-col gap-3 p-5 sm:border-r border-rule border-b sm:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-muted-foreground">
                    Factures impayées
                  </span>
                  <BanknoteIcon className="size-4 shrink-0 text-primary" />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-normal tabular-nums text-ink tracking-tight truncate">
                  {formatDZD(unpaidMetrics.totalAmount)}
                </div>
                <p className="text-[13px] text-muted-foreground">
                  <span className="font-medium text-ink tabular-nums">{unpaidMetrics.count}</span>{' '}
                  facture{unpaidMetrics.count > 1 ? 's' : ''} client &amp; fournisseur en attente.
                </p>
              </div>

              <div
                data-testid="kpi-upcoming-deadlines"
                className="flex flex-col gap-3 p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-muted-foreground">
                    Échéances à venir
                  </span>
                  <CalendarClockIcon className="size-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="font-display text-4xl font-normal tabular-nums text-ink tracking-tight">
                  {upcomingDeadlinesCount}
                </div>
                <p className="text-[13px] text-muted-foreground">
                  Déclarations fiscales, expirations de documents et rappels manuels.
                </p>
              </div>
            </div>
          </section>

          <CalendarAlertsSection alerts={calendarAlerts} />

          <DocumentAlertsSection
            alerts={documentAlerts}
            onDocumentUpdated={() => void fetchDashboardData(true)}
          />

          <OutstandingInvoicesSection
            invoices={outstandingInvoices}
            onInvoiceUpdated={() => void fetchDashboardData(true)}
          />

          <ManualDeadlineForm
            manualDeadlines={manualDeadlines}
            onRefresh={() => void fetchDashboardData(true)}
          />
        </>
      )}
    </div>
  )
}
