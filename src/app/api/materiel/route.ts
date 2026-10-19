import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { z } from 'zod'

const machineCreateSchema = z.object({
  machineId: z.string().trim().min(1, "L'identifiant de la machine est requis"),
  marque: z.string().trim().nullable().optional(),
  modele: z.string().trim().nullable().optional(),
  numeroSerie: z.string().trim().nullable().optional(),
  matricule: z.string().trim().nullable().optional(),
  statut: z.enum(['ACTIF', 'EN_MAINTENANCE', 'HORS_SERVICE']).optional().default('ACTIF'),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const machines = await db.machine.findMany({
    orderBy: { machineId: 'asc' },
    include: {
      _count: {
        select: { documents: true },
      },
    },
  })

  return NextResponse.json(machines)
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

  const validation = machineCreateSchema.safeParse(body)
  if (!validation.success) {
    const issues = validation.error.issues || []
    const errorMessage = issues.map((e) => e.message).join(', ') || 'Validation échouée'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }

  const { machineId, marque, modele, numeroSerie, matricule, statut } = validation.data

  const existingMachine = await db.machine.findUnique({
    where: { machineId },
  })

  if (existingMachine) {
    return NextResponse.json(
      { error: 'Cet identifiant de machine existe déjà' },
      { status: 409 }
    )
  }

  const machine = await db.machine.create({
    data: {
      machineId,
      marque: marque || null,
      modele: modele || null,
      numeroSerie: numeroSerie || null,
      matricule: matricule || null,
      statut: statut || 'ACTIF',
    },
  })

  return NextResponse.json(machine, { status: 201 })
}
