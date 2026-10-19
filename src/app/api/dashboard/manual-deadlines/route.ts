import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'

export async function GET(_req: Request) {
  void _req
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const manualDeadlines = await db.manualDeadline.findMany({
    orderBy: {
      dueDate: 'asc',
    },
  })

  return NextResponse.json(manualDeadlines, { status: 200 })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
  }

  const { label, dueDate, yellowDaysBefore, redDaysBefore } = (body as Record<string, unknown>) || {}

  if (typeof label !== 'string' || !label.trim()) {
    return NextResponse.json({ error: 'Le libellé est requis' }, { status: 400 })
  }

  if (!dueDate || typeof dueDate !== 'string' && !(dueDate instanceof Date)) {
    return NextResponse.json({ error: "Date d'échéance invalide" }, { status: 400 })
  }

  const parsedDueDate = new Date(dueDate)
  if (isNaN(parsedDueDate.getTime())) {
    return NextResponse.json({ error: "Date d'échéance invalide" }, { status: 400 })
  }

  const parsedYellow =
    yellowDaysBefore !== undefined && yellowDaysBefore !== null && yellowDaysBefore !== ''
      ? Number(yellowDaysBefore)
      : 30

  const parsedRed =
    redDaysBefore !== undefined && redDaysBefore !== null && redDaysBefore !== ''
      ? Number(redDaysBefore)
      : 7

  if (isNaN(parsedYellow) || parsedYellow < 0) {
    return NextResponse.json({ error: 'Seuil jaune invalide' }, { status: 400 })
  }

  if (isNaN(parsedRed) || parsedRed < 0) {
    return NextResponse.json({ error: 'Seuil rouge invalide' }, { status: 400 })
  }

  if (parsedYellow < parsedRed) {
    return NextResponse.json(
      { error: 'Le seuil jaune doit être supérieur ou égal au seuil rouge' },
      { status: 400 }
    )
  }

  const created = await db.manualDeadline.create({
    data: {
      label: label.trim(),
      dueDate: parsedDueDate,
      yellowDaysBefore: parsedYellow,
      redDaysBefore: parsedRed,
    },
  })

  return NextResponse.json(created, { status: 201 })
}
