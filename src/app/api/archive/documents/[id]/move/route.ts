import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)

  const doc = await db.document.findUnique({
    where: { id },
  })
  if (!doc) {
    return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
  }

  const targetClusterId = typeof body?.targetClusterId === 'string' ? body.targetClusterId.trim() : ''
  if (!targetClusterId) {
    return NextResponse.json({ error: 'Le dossier cible est requis' }, { status: 400 })
  }

  const targetCluster = await db.archiveCluster.findUnique({
    where: { id: targetClusterId },
  })
  if (!targetCluster) {
    return NextResponse.json({ error: 'Dossier cible non trouvé' }, { status: 404 })
  }

  const updatedDocument = await db.document.update({
    where: { id },
    data: {
      archiveClusterId: targetClusterId,
    },
  })

  return NextResponse.json(updatedDocument)
}
