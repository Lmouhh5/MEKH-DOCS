import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { z } from 'zod'

const clientCreateSchema = z.object({
  nom: z.string().trim().min(1, 'Le nom est requis'),
  nif: z.string().trim().nullable().optional(),
  telephone: z.string().trim().nullable().optional(),
  adresse: z.string().trim().nullable().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const clients = await db.client.findMany({
    orderBy: { nom: 'asc' },
    include: {
      _count: {
        select: { documents: true },
      },
    },
  })

  return NextResponse.json(clients)
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

  const validation = clientCreateSchema.safeParse(body)
  if (!validation.success) {
    const issues = validation.error.issues || []
    const errorMessage = issues.map((e) => e.message).join(', ') || 'Validation échouée'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }

  const { nom, nif, telephone, adresse } = validation.data

  const client = await db.client.create({
    data: {
      nom,
      nif: nif || null,
      telephone: telephone || null,
      adresse: adresse || null,
    },
  })

  return NextResponse.json(client, { status: 201 })
}
