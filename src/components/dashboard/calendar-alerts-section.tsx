'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarAlert } from '@/lib/deadlines'
import { cn } from '@/lib/utils'
import { CalendarIcon, AlertTriangleIcon, CheckCircle2Icon } from 'lucide-react'

export interface CalendarAlertsSectionProps {
  alerts: CalendarAlert[]
  className?: string
}

function formatDate(date: Date | string) {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return String(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getDaysRemaining(dueDate: Date | string) {
  const target = dueDate instanceof Date ? dueDate : new Date(dueDate)
  const now = new Date()
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime()

  const diffMs = startOfTarget - startOfNow
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (days < 0) return 'Délai dépassé'
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Demain (1 jour restant)'
  return `${days} jours restants`
}

export function CalendarAlertsSection({ alerts, className }: CalendarAlertsSectionProps) {
  return (
    <Card className={cn('border border-border/70 shadow-sm bg-card', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <CalendarIcon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Échéances Réglementaires & Fiscales
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Déclarations obligatoires (G50, CNAS trimestrielle, IBS / G40)
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {alerts.length} alerte{alerts.length > 1 ? 's' : ''}
        </Badge>
      </CardHeader>

      <CardContent className="pt-2">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-border/60 bg-muted/10 text-muted-foreground">
            <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
              <CheckCircle2Icon className="size-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Aucune échéance réglementaire imminente
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Toutes les déclarations fiscales et sociales périodiques sont hors période d&apos;alerte.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((alert, idx) => {
              const isRed = alert.severity === 'red'
              const daysText = getDaysRemaining(alert.dueDate)

              return (
                <div
                  key={`${alert.type}-${idx}`}
                  data-testid={`calendar-alert-${alert.type}`}
                  className={cn(
                    'p-4 rounded border transition-all flex flex-col justify-between gap-3 shadow-xs',
                    isRed
                      ? 'border-l-4 border-l-red-600 border-red-500/30 bg-red-500/5 dark:bg-red-950/20'
                      : 'border-l-4 border-l-amber-600 border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'p-1.5 rounded-md shrink-0',
                          isRed
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        )}
                      >
                        <AlertTriangleIcon className="size-4" />
                      </span>
                      <h4 className="text-sm font-bold text-foreground">
                        {alert.label}
                      </h4>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] uppercase font-bold shrink-0 tracking-wider',
                        isRed
                          ? 'border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10'
                          : 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                      )}
                    >
                      {isRed ? 'Urgent' : 'Attention'}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {alert.description}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40 text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Échéance : {formatDate(alert.dueDate)}
                    </span>
                    <span
                      className={cn(
                        'font-semibold',
                        isRed ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                      )}
                    >
                      {daysText}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
