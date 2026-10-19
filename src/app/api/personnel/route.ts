import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { z } from 'zod'

const workerCreateSchema = z
  .object({
    nom: z.string().trim().min(1, 'Le nom est requis'),
    numeroIdentification: z.string().trim().nullable().optional(),
    dateDebutContrat: z.string().trim().nullable().optional(),
    numeroCnas: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.dateDebutContrat && data.dateDebutContrat.trim() !== '') {
        const d = new Date(data.dateDebutContrat)
        return !isNaN(d.getTime())
      }
      return true
    },
    {
      message: 'Date de début de contrat invalide',
      path: ['dateDebutContrat'],
    }
  )

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const workers = await db.travailleur.findMany({
    orderBy: { nom: 'asc' },
    include: {
      _count: {
        select: { documents: true },
      },
    },
  })

  return NextResponse.json(workers)
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

  const validation = workerCreateSchema.safeParse(body)
  if (!validation.success) {
    const issues = validation.error.issues || []
    const errorMessage = issues.map((e) => e.message).join(', ') || 'Validation échouée'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }

  const { nom, numeroIdentification, dateDebutContrat, numeroCnas } = validation.data

  const parsedDate =
    dateDebutContrat && dateDebutContrat.trim() !== ''
      ? new Date(dateDebutContrat)
      : null

  const worker = await db.travailleur.create({
    data: {
      nom,
      numeroIdentification: numeroIdentification || null,
      dateDebutContrat: parsedDate,
      numeroCnas: numeroCnas || null,
    },
  })

  return NextResponse.json(worker, { status: 201 })
}
