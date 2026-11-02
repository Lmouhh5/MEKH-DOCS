'use client'
/* Hallmark · waive 26b · not a form control, no aria-disabled anywhere · calendar widget is a display panel */

import React from 'react'
import { CalendarAlert } from '@/lib/deadlines'
import { RibbonEmpty, RibbonMetaChip, RibbonWidget } from '@/components/dashboard/ribbon-widget'
import { cn } from '@/lib/utils'
import { CalendarIcon, AlertTriangleIcon } from 'lucide-react'

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
    <RibbonWidget
      index={0}
      className={className}
      title="Échéances Réglementaires & Fiscales"
      description="Déclarations obligatoires (G50, CNAS trimestrielle, IBS / G40)"
      icon={<CalendarIcon className="size-4" />}
      meta={
        <RibbonMetaChip lit={alerts.length > 0} warn={alerts.some((a) => a.severity === 'red')}>
          {alerts.length} alerte{alerts.length > 1 ? 's' : ''}
        </RibbonMetaChip>
      }
    >
      {alerts.length === 0 ? (
        <RibbonEmpty
          title="Aucune échéance réglementaire imminente"
          description="Toutes les déclarations fiscales et sociales périodiques sont hors période d'alerte."
          meters={[
            { label: 'G50', level: 0 },
            { label: 'CNAS', level: 0 },
            { label: 'IBS', level: 0 },
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {alerts.map((alert, idx) => {
            const isRed = alert.severity === 'red'
            const daysText = getDaysRemaining(alert.dueDate)

            return (
              <article
                key={`${alert.type}-${idx}`}
                data-testid={`calendar-alert-${alert.type}`}
                className={cn(
                  'ribbon-part ribbon-widget p-4 flex flex-col justify-between gap-3',
                  isRed && 'ring-1 ring-destructive/40'
                )}
                style={{ ['--i' as string]: idx }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'size-8 rounded-part shrink-0 flex items-center justify-center',
                        isRed ? 'bg-destructive/15 text-destructive' : 'bg-accent text-primary'
                      )}
                    >
                      <AlertTriangleIcon className="size-4" />
                    </span>
                    <h3 className="font-display text-sm font-medium text-ink tracking-tight max-w-none">
                      {alert.label}
                    </h3>
                  </div>
                  <RibbonMetaChip warn={isRed} lit={!isRed}>
                    {isRed ? 'Urgent' : 'Attention'}
                  </RibbonMetaChip>
                </div>

                <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
                  {alert.description}
                </p>

                <div className="flex items-center justify-between text-[13px] pt-2 border-t border-rule text-muted-foreground">
                  <span className="font-medium text-ink">
                    Échéance : {formatDate(alert.dueDate)}
                  </span>
                  <span
                    className={cn(
                      'font-display tabular-nums',
                      isRed ? 'text-destructive' : 'text-primary'
                    )}
                  >
                    {daysText}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </RibbonWidget>
  )
}
