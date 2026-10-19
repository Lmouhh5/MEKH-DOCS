import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { ALERT_THRESHOLDS } from '@/lib/constants'
import {
  computeCalendarAlerts,
  computeDocumentSeverity,
  DocumentAlert,
  ManualAlert,
} from '@/lib/deadlines'

function getEntityName(doc: {
  client?: { nom: string } | null
  fournisseur?: { nom: string } | null
  machine?: { machineId?: string | null; marque?: string | null; matricule?: string | null } | null
  travailleur?: { nom: string } | null
}): string | undefined {
  if (doc.client?.nom) return doc.client.nom
  if (doc.fournisseur?.nom) return doc.fournisseur.nom
  if (doc.machine) {
    if (doc.machine.machineId && doc.machine.marque) {
      return `${doc.machine.machineId} - ${doc.machine.marque}`
    }
    return doc.machine.machineId || doc.machine.marque || doc.machine.matricule || undefined
  }
  if (doc.travailleur?.nom) return doc.travailleur.nom
  return undefined
}

export async function GET(_req: Request) {
  void _req
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now = new Date()

  // 1. Regulatory calendar alerts (G50, CNAS, IBS)
  const calendarAlerts = computeCalendarAlerts(now)

  // 2. Document expiration alerts
  const documents = await db.document.findMany({
    where: {
      dueDate: { not: null },
      OR: [{ isPaid: false }, { isPaid: null }],
    },
    include: {
      client: true,
      fournisseur: true,
      machine: true,
      travailleur: true,
    },
    orderBy: {
      dueDate: 'asc',
    },
  })

  const documentAlerts: DocumentAlert[] = []

  for (const doc of documents) {
    if (!doc.dueDate || doc.isPaid === true) continue

    const isMachineAlert =
      doc.documentType === 'ASSURANCE' || doc.documentType === 'CONTROLE_TECHNIQUE'

    const warnDays = isMachineAlert
      ? ALERT_THRESHOLDS.MACHINE_WARN_DAYS
      : ALERT_THRESHOLDS.DEFAULT_WARN_DAYS
    const redDays = isMachineAlert
      ? ALERT_THRESHOLDS.MACHINE_RED_DAYS
      : ALERT_THRESHOLDS.DEFAULT_RED_DAYS

    const severity = computeDocumentSeverity(new Date(doc.dueDate), now, warnDays, redDays)
    if (!severity) continue

    documentAlerts.push({
      documentId: doc.id,
      title: doc.title,
      entityName: getEntityName(doc),
      documentType: doc.documentType,
      dueDate:
        doc.dueDate instanceof Date ? doc.dueDate.toISOString() : new Date(doc.dueDate).toISOString(),
      severity,
      module: doc.module,
    })
  }

  // 3. Manual deadline alerts
  const manualDeadlines = await db.manualDeadline.findMany({
    orderBy: {
      dueDate: 'asc',
    },
  })

  const manualAlerts: ManualAlert[] = []

  for (const manual of manualDeadlines) {
    const severity = computeDocumentSeverity(
      new Date(manual.dueDate),
      now,
      manual.yellowDaysBefore,
      manual.redDaysBefore
    )
    if (!severity) continue

    manualAlerts.push({
      id: manual.id,
      label: manual.label,
      dueDate:
        manual.dueDate instanceof Date
          ? manual.dueDate.toISOString()
          : new Date(manual.dueDate).toISOString(),
      severity,
      yellowDaysBefore: manual.yellowDaysBefore,
      redDaysBefore: manual.redDaysBefore,
    })
  }

  return NextResponse.json(
    {
      calendarAlerts,
      documentAlerts,
      manualAlerts,
    },
    { status: 200 }
  )
}
