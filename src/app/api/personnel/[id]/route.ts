import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { getSignedUrl, deleteFile } from '@/lib/minio'
import { z } from 'zod'

const workerUpdateSchema = z
  .object({
    nom: z.string().trim().min(1, 'Le nom ne peut pas être vide').optional(),
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

export async function GET(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)
  const worker = await db.travailleur.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { issueDate: 'desc' },
      },
    },
  })

  if (!worker) {
    return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 })
  }

  const documents = await Promise.all(
    worker.documents.map(async (doc) => {
      let signedUrl: string | undefined
      try {
        signedUrl = await getSignedUrl(doc.fileKey)
      } catch (err) {
        console.error(`Failed to generate signed URL for document ${doc.id}:`, err)
      }

      return {
        id: doc.id,
        title: doc.title,
        documentType: doc.documentType,
        module: doc.module,
        issueDate: doc.issueDate.toISOString(),
        dueDate: doc.dueDate ? doc.dueDate.toISOString() : undefined,
        amount: doc.amount ? Number(doc.amount) : undefined,
        isPaid: doc.isPaid ?? undefined,
        physicalLocation: doc.physicalLocation,
        notes: doc.notes,
        fileKey: doc.fileKey,
        signedUrl,
        url: signedUrl,
        entityName: worker.nom,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      }
    })
  )

  return NextResponse.json({
    ...worker,
    dateDebutContrat: worker.dateDebutContrat ? worker.dateDebutContrat.toISOString() : null,
    documents,
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
  const existingWorker = await db.travailleur.findUnique({
    where: { id },
  })

  if (!existingWorker) {
    return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
  }

  const validation = workerUpdateSchema.safeParse(body)
  if (!validation.success) {
    const issues = validation.error.issues || []
    const errorMessage = issues.map((e) => e.message).join(', ') || 'Validation échouée'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }

  const data = validation.data
  const updateData: {
    nom?: string
    numeroIdentification?: string | null
    dateDebutContrat?: Date | null
    numeroCnas?: string | null
  } = {}

  if (data.nom !== undefined) updateData.nom = data.nom
  if (data.numeroIdentification !== undefined) {
    updateData.numeroIdentification = data.numeroIdentification ? data.numeroIdentification : null
  }
  if (data.numeroCnas !== undefined) {
    updateData.numeroCnas = data.numeroCnas ? data.numeroCnas : null
  }
  if (data.dateDebutContrat !== undefined) {
    updateData.dateDebutContrat =
      data.dateDebutContrat && data.dateDebutContrat.trim() !== ''
        ? new Date(data.dateDebutContrat)
        : null
  }

  const updatedWorker = await db.travailleur.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({
    ...updatedWorker,
    dateDebutContrat: updatedWorker.dateDebutContrat
      ? updatedWorker.dateDebutContrat.toISOString()
      : null,
  })
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)
  const existingWorker = await db.travailleur.findUnique({
    where: { id },
    include: { documents: true },
  })

  if (!existingWorker) {
    return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 })
  }

  for (const doc of existingWorker.documents) {
    try {
      await deleteFile(doc.fileKey)
    } catch (err) {
      console.error(`Failed to delete minio file ${doc.fileKey}:`, err)
    }
  }

  await db.travailleur.delete({
    where: { id },
  })

  return NextResponse.json({ success: true, message: 'Employé supprimé' })
}
