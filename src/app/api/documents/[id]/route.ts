import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { getSignedUrl, deleteFile } from '@/lib/minio'
import { Prisma } from '@prisma/client'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  void _req
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)
  const document = await db.document.findUnique({
    where: { id },
    include: {
      client: true,
      fournisseur: true,
      machine: true,
      travailleur: true,
    },
  })

  if (!document) {
    return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
  }

  const signedUrl = await getSignedUrl(document.fileKey)
  const documentWithoutKey = { ...document }
  delete (documentWithoutKey as Partial<typeof document>).fileKey

  return NextResponse.json({
    ...documentWithoutKey,
    signedUrl,
    url: signedUrl,
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)
  const document = await db.document.findUnique({
    where: { id },
  })

  if (!document) {
    return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
  }

  const { title, notes, physicalLocation, amount, isPaid, dueDate } = body

  // Re-verify dueDate if documentType is ASSURANCE or CONTROLE_TECHNIQUE
  if (
    document.documentType === 'ASSURANCE' ||
    document.documentType === 'CONTROLE_TECHNIQUE'
  ) {
    if (dueDate !== undefined) {
      if (!dueDate || (typeof dueDate === 'string' && dueDate.trim() === '')) {
        return NextResponse.json(
          { error: "La date d'échéance est requise pour ce type de document" },
          { status: 400 }
        )
      }
    }
  }

  const updateData: Prisma.DocumentUpdateInput = {}

  if (title !== undefined) {
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 })
    }
    updateData.title = title.trim()
  }

  if (notes !== undefined) {
    updateData.notes = notes ? String(notes).trim() : null
  }

  if (physicalLocation !== undefined) {
    updateData.physicalLocation = physicalLocation ? String(physicalLocation).trim() : null
  }

  if (amount !== undefined) {
    if (amount === null || amount === '') {
      updateData.amount = null
    } else {
      const parsedAmount = Number(amount)
      if (isNaN(parsedAmount)) {
        return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
      }
      updateData.amount = new Prisma.Decimal(String(amount))
    }
  }

  if (isPaid !== undefined) {
    updateData.isPaid = isPaid === null ? null : Boolean(isPaid)
  }

  if (dueDate !== undefined) {
    if (dueDate === null || (typeof dueDate === 'string' && dueDate.trim() === '')) {
      updateData.dueDate = null
    } else {
      const parsedDate = new Date(String(dueDate))
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: "Date d'échéance invalide" }, { status: 400 })
      }
      updateData.dueDate = parsedDate
    }
  }

  const updatedDocument = await db.document.update({
    where: { id },
    data: updateData,
    include: {
      client: true,
      fournisseur: true,
      machine: true,
      travailleur: true,
    },
  })

  const signedUrl = await getSignedUrl(updatedDocument.fileKey)
  const documentWithoutKey = { ...updatedDocument }
  delete (documentWithoutKey as Partial<typeof updatedDocument>).fileKey

  return NextResponse.json({
    ...documentWithoutKey,
    signedUrl,
    url: signedUrl,
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  void _req
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)
  const document = await db.document.findUnique({
    where: { id },
  })

  if (!document) {
    return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
  }

  try {
    await deleteFile(document.fileKey)
  } catch (err) {
    console.error('Failed to delete file from MinIO:', err)
  }

  await db.document.delete({
    where: { id },
  })

  return NextResponse.json({ success: true }, { status: 200 })
}
