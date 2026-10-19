import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { getSignedUrl } from '@/lib/minio'

function getEntityName(doc: {
  client?: { nom: string } | null
  fournisseur?: { nom: string } | null
  machine?: { machineId?: string | null; marque?: string | null; matricule?: string | null; nom?: string | null } | null
  travailleur?: { nom: string; prenom?: string | null } | null
}): string | undefined {
  if (doc.client?.nom) return doc.client.nom
  if (doc.fournisseur?.nom) return doc.fournisseur.nom
  if (doc.machine) {
    if (doc.machine.machineId && doc.machine.marque) {
      return `${doc.machine.machineId} - ${doc.machine.marque}`
    }
    return doc.machine.nom || doc.machine.machineId || doc.machine.marque || doc.machine.matricule || undefined
  }
  if (doc.travailleur?.nom) {
    return `${doc.travailleur.prenom ?? ''} ${doc.travailleur.nom}`.trim()
  }
  return undefined
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)

  const links = await db.documentLink.findMany({
    where: {
      OR: [
        { documentAId: id },
        { documentBId: id },
      ],
    },
  })

  if (!links || links.length === 0) {
    return NextResponse.json([], { status: 200 })
  }

  const linkedIds = links.map((link) =>
    link.documentAId === id ? link.documentBId : link.documentAId
  )

  const documents = await db.document.findMany({
    where: {
      id: { in: linkedIds },
    },
    include: {
      client: true,
      fournisseur: true,
      machine: true,
      travailleur: true,
    },
  })

  const results = await Promise.all(
    documents.map(async (doc) => {
      let signedUrl = ''
      try {
        if (doc.fileKey) {
          signedUrl = await getSignedUrl(doc.fileKey)
        }
      } catch {
        // Storage unreachable fallback
      }

      return {
        id: doc.id,
        title: doc.title,
        documentType: doc.documentType,
        module: doc.module,
        issueDate: doc.issueDate instanceof Date ? doc.issueDate.toISOString() : doc.issueDate,
        dueDate: doc.dueDate ? (doc.dueDate instanceof Date ? doc.dueDate.toISOString() : doc.dueDate) : undefined,
        amount: doc.amount != null ? Number(doc.amount) : undefined,
        isPaid: doc.isPaid ?? undefined,
        entityName: getEntityName(doc),
        signedUrl,
        url: signedUrl,
        physicalLocation: doc.physicalLocation || undefined,
        notes: doc.notes || undefined,
        client: doc.client || undefined,
        fournisseur: doc.fournisseur || undefined,
        machine: doc.machine || undefined,
        travailleur: doc.travailleur || undefined,
      }
    })
  )

  return NextResponse.json(results, { status: 200 })
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)

  let body: { targetId?: unknown }
  try {
    body = (await req.json()) as { targetId?: unknown }
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
  }

  const { targetId } = body
  if (!targetId || typeof targetId !== 'string' || targetId.trim() === '') {
    return NextResponse.json({ error: 'targetId est requis' }, { status: 400 })
  }

  const cleanTargetId = targetId.trim()
  if (cleanTargetId === id) {
    return NextResponse.json(
      { error: 'Impossible de lier un document à lui-même' },
      { status: 400 }
    )
  }

  const currentDoc = await db.document.findUnique({
    where: { id },
  })
  if (!currentDoc) {
    return NextResponse.json({ error: 'Document source non trouvé' }, { status: 404 })
  }

  const targetDoc = await db.document.findUnique({
    where: { id: cleanTargetId },
  })
  if (!targetDoc) {
    return NextResponse.json({ error: 'Document cible non trouvé' }, { status: 404 })
  }

  const existingLink = await db.documentLink.findFirst({
    where: {
      OR: [
        { documentAId: id, documentBId: cleanTargetId },
        { documentAId: cleanTargetId, documentBId: id },
      ],
    },
  })

  if (existingLink) {
    return NextResponse.json({ error: 'Ces documents sont déjà liés' }, { status: 409 })
  }

  try {
    const link = await db.documentLink.create({
      data: {
        documentAId: id,
        documentBId: cleanTargetId,
      },
    })

    return NextResponse.json({ success: true, link }, { status: 201 })
  } catch (error: unknown) {
    // Unique constraint violation in Prisma code P2002
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Ces documents sont déjà liés' }, { status: 409 })
    }
    throw error
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)

  let targetId: string | null = null
  const { searchParams } = new URL(req.url)
  const queryTarget = searchParams.get('targetId')?.trim()

  if (queryTarget) {
    targetId = queryTarget
  } else {
    try {
      const body = (await req.json()) as { targetId?: unknown }
      if (body && typeof body.targetId === 'string' && body.targetId.trim()) {
        targetId = body.targetId.trim()
      }
    } catch {
      // Body may be empty
    }
  }

  if (!targetId) {
    return NextResponse.json({ error: 'targetId est requis' }, { status: 400 })
  }

  const existingLink = await db.documentLink.findFirst({
    where: {
      OR: [
        { documentAId: id, documentBId: targetId },
        { documentAId: targetId, documentBId: id },
      ],
    },
  })

  if (!existingLink) {
    return NextResponse.json({ error: 'Lien non trouvé' }, { status: 404 })
  }

  await db.documentLink.delete({
    where: { id: existingLink.id },
  })

  return NextResponse.json({ success: true }, { status: 200 })
}
