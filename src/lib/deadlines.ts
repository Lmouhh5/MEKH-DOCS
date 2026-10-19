import { ALERT_THRESHOLDS } from '@/lib/constants'

export interface CalendarAlert {
  type: 'G50' | 'CNAS' | 'IBS_G40'
  severity: 'yellow' | 'red'
  label: string
  dueDate: Date
  description: string
}

export interface DocumentAlert {
  documentId: string
  title: string
  entityName?: string | null
  documentType: string
  dueDate: Date | string
  severity: 'yellow' | 'red' | 'overdue'
  module?: string
}

export interface ManualAlert {
  id: string
  label: string
  dueDate: Date | string
  severity: 'yellow' | 'red' | 'overdue'
  yellowDaysBefore: number
  redDaysBefore: number
}

/**
 * Computes calendar-based regulatory alerts for Algerian taxation and social declarations:
 * - G50: Due on the 20th of the current month.
 * - CNAS: Due at each quarter end (31/03, 30/06, 30/09, 31/12).
 * - IBS / G40: Due on April 30th.
 */
export function computeCalendarAlerts(now: Date): CalendarAlert[] {
  const alerts: CalendarAlert[] = []

  // 1. G50: Due 20th of the current month
  const day = now.getDate()
  const g50Due = new Date(now.getFullYear(), now.getMonth(), 20)

  if (day >= ALERT_THRESHOLDS.G50_RED_DAY) {
    alerts.push({
      type: 'G50',
      severity: 'red',
      label: 'Déclaration G50',
      dueDate: g50Due,
      description: 'Déclaration fiscale mensuelle (série G n° 50) due le 20 du mois.',
    })
  } else if (day >= ALERT_THRESHOLDS.G50_WARN_DAY) {
    alerts.push({
      type: 'G50',
      severity: 'yellow',
      label: 'Déclaration G50',
      dueDate: g50Due,
      description: 'Déclaration fiscale mensuelle (série G n° 50) due le 20 du mois.',
    })
  }

  // 2. CNAS: Quarter ends March 31, June 30, September 30, December 31
  const year = now.getFullYear()
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const quarterEnds = [
    new Date(year, 2, 31),
    new Date(year, 5, 30),
    new Date(year, 8, 30),
    new Date(year, 11, 31),
    new Date(year + 1, 2, 31),
  ]

  const nextQuarterEnd = quarterEnds.find((d) => d.getTime() >= startOfNow.getTime())!
  const cnasDiffMs = nextQuarterEnd.getTime() - startOfNow.getTime()
  const cnasDaysUntil = Math.round(cnasDiffMs / (1000 * 60 * 60 * 24))

  if (cnasDaysUntil <= ALERT_THRESHOLDS.CNAS_RED_DAYS) {
    alerts.push({
      type: 'CNAS',
      severity: 'red',
      label: 'Déclaration CNAS',
      dueDate: nextQuarterEnd,
      description: "Déclaration d'assiette des cotisations trimestrielle CNAS.",
    })
  } else if (cnasDaysUntil <= ALERT_THRESHOLDS.CNAS_WARN_DAYS) {
    alerts.push({
      type: 'CNAS',
      severity: 'yellow',
      label: 'Déclaration CNAS',
      dueDate: nextQuarterEnd,
      description: "Déclaration d'assiette des cotisations trimestrielle CNAS.",
    })
  }

  // 3. IBS / G40: Due April 30th
  let ibsDue = new Date(now.getFullYear(), 3, 30)
  if (startOfNow.getTime() > ibsDue.getTime()) {
    ibsDue = new Date(now.getFullYear() + 1, 3, 30)
  }

  const ibsDiffMs = ibsDue.getTime() - startOfNow.getTime()
  const ibsDaysUntil = Math.round(ibsDiffMs / (1000 * 60 * 60 * 24))

  if (ibsDaysUntil <= ALERT_THRESHOLDS.IBS_RED_DAYS) {
    alerts.push({
      type: 'IBS_G40',
      severity: 'red',
      label: 'Déclaration IBS / G40',
      dueDate: ibsDue,
      description: 'Déclaration annuelle des résultats IBS (série G n° 40) due au 30 avril.',
    })
  } else if (ibsDaysUntil <= ALERT_THRESHOLDS.IBS_WARN_DAYS) {
    alerts.push({
      type: 'IBS_G40',
      severity: 'yellow',
      label: 'Déclaration IBS / G40',
      dueDate: ibsDue,
      description: 'Déclaration annuelle des résultats IBS (série G n° 40) due au 30 avril.',
    })
  }

  return alerts
}

/**
 * Computes severity for a document expiration or manual deadline:
 * - If dueDate < now -> 'overdue'
 * - If daysUntil <= redDays -> 'red'
 * - If daysUntil <= warnDays -> 'yellow'
 * - Else null
 */
export function computeDocumentSeverity(
  dueDate: Date,
  now: Date,
  warnDays: number,
  redDays: number
): 'yellow' | 'red' | 'overdue' | null {
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

  if (startOfDue.getTime() < startOfNow.getTime()) {
    return 'overdue'
  }

  const diffMs = startOfDue.getTime() - startOfNow.getTime()
  const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (daysUntil <= redDays) {
    return 'red'
  }

  if (daysUntil <= warnDays) {
    return 'yellow'
  }

  return null
}
