'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
  LayersIcon,
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
      // Parallel fetching of all three endpoints for optimal performance (< 1.5s)
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

  // KPI 1: Urgent alerts (red calendar + overdue/red document alerts + overdue/red manual alerts)
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

  // KPI 2: Unpaid invoices metrics
  const unpaidMetrics = useMemo(() => {
    const unpaid = outstandingInvoices.filter((inv) => !inv.isPaid)
    const totalAmount = unpaid.reduce((sum, inv) => sum + (inv.amount || 0), 0)
    return {
      count: unpaid.length,
      totalAmount,
    }
  }, [outstandingInvoices])

  // KPI 3: Upcoming deadlines (all active alerts + manual deadlines)
  const upcomingDeadlinesCount = useMemo(() => {
    return calendarAlerts.length + documentAlerts.length + manualDeadlines.length
  }, [calendarAlerts, documentAlerts, manualDeadlines])

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col gap-8">
      {/* En-tête principal du tableau de bord */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <LayersIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Tableau de Suivi des Échéances
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilotage centralisé des alertes réglementaires, expirations documentaires et factures impayées.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void fetchDashboardData(true)}
            disabled={loading || refreshing}
            className="gap-1.5"
            data-testid="refresh-dashboard-btn"
          >
            <RefreshCwIcon className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* État de chargement initial */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-3 border rounded-xl bg-card/40">
          <Loader2Icon className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Chargement du tableau de bord...</p>
        </div>
      ) : error ? (
        <div className="p-6 flex items-center justify-center gap-2 text-sm text-destructive border border-dashed rounded-xl bg-destructive/5">
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
          {/* Cartes KPI exécutives en haut de page */}
          <section aria-label="Indicateurs clés" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* KPI 1 : Alertes Urgentes */}
            <Card
              data-testid="kpi-urgent-alerts"
              className="border border-border/70 bg-card shadow-xs transition-shadow hover:shadow-sm"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Alertes Urgentes
                </CardTitle>
                <div
                  className={`p-2 rounded-full ${
                    urgentAlertsCount > 0
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <AlertTriangleIcon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {urgentAlertsCount}
                  </span>
                  {urgentAlertsCount > 0 ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Action requise
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-500/30"
                    >
                      À jour
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Échéances critiques dépassées ou imminentes (&le; 7 jours).
                </p>
              </CardContent>
            </Card>

            {/* KPI 2 : Factures Impayées */}
            <Card
              data-testid="kpi-outstanding-invoices"
              className="border border-border/70 bg-card shadow-xs transition-shadow hover:shadow-sm"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Factures Impayées
                </CardTitle>
                <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <BanknoteIcon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-foreground truncate">
                  {formatDZD(unpaidMetrics.totalAmount)}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  <span className="font-semibold text-foreground">{unpaidMetrics.count}</span> facture{unpaidMetrics.count > 1 ? 's' : ''} client & fournisseur en attente.
                </p>
              </CardContent>
            </Card>

            {/* KPI 3 : Échéances à venir */}
            <Card
              data-testid="kpi-upcoming-deadlines"
              className="border border-border/70 bg-card shadow-xs transition-shadow hover:shadow-sm"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Échéances à Venir
                </CardTitle>
                <div className="p-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <CalendarClockIcon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-foreground">
                  {upcomingDeadlinesCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Déclarations fiscales, expirations de documents et rappels manuels.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Section 1 : Alertes de calendrier réglementaire (G50, CNAS, IBS) */}
          <CalendarAlertsSection alerts={calendarAlerts} />

          {/* Section 2 : Alertes documentaires (Assurance, Contrôle technique, Contrats, etc.) */}
          <DocumentAlertsSection
            alerts={documentAlerts}
            onDocumentUpdated={() => void fetchDashboardData(true)}
          />

          {/* Section 3 : Factures impayées avec bouton de bascule Payé / Impayé */}
          <OutstandingInvoicesSection
            invoices={outstandingInvoices}
            onInvoiceUpdated={() => void fetchDashboardData(true)}
          />

          {/* Section 4 : Échéances manuelles et formulaire d'ajout */}
          <ManualDeadlineForm
            manualDeadlines={manualDeadlines}
            onRefresh={() => void fetchDashboardData(true)}
          />
        </>
      )}
    </div>
  )
}
