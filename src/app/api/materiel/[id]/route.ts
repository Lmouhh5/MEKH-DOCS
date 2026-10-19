import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { getSignedUrl, deleteFile } from '@/lib/minio'
import { z } from 'zod'

const machineUpdateSchema = z.object({
  machineId: z.string().trim().min(1, "L'identifiant de la machine ne peut pas être vide").optional(),
  marque: z.string().trim().nullable().optional(),
  modele: z.string().trim().nullable().optional(),
  numeroSerie: z.string().trim().nullable().optional(),
  matricule: z.string().trim().nullable().optional(),
  statut: z.enum(['ACTIF', 'EN_MAINTENANCE', 'HORS_SERVICE']).optional(),
})

export async function GET(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)
  const machine = await db.machine.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!machine) {
    return NextResponse.json({ error: 'Matériel non trouvé' }, { status: 404 })
  }

  const documents = await Promise.all(
    machine.documents.map(async (doc) => {
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
        entityName: machine.machineId,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      }
    })
  )

  return NextResponse.json({
    ...machine,
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
  const existingMachine = await db.machine.findUnique({
    where: { id },
  })

  if (!existingMachine) {
    return NextResponse.json({ error: 'Matériel non trouvé' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
  }

  const validation = machineUpdateSchema.safeParse(body)
  if (!validation.success) {
    const issues = validation.error.issues || []
    const errorMessage = issues.map((e) => e.message).join(', ') || 'Validation échouée'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }

  const data = validation.data

  if (data.machineId && data.machineId !== existingMachine.machineId) {
    const duplicate = await db.machine.findUnique({
      where: { machineId: data.machineId },
    })
    if (duplicate && duplicate.id !== id) {
      return NextResponse.json(
        { error: 'Cet identifiant de machine existe déjà' },
        { status: 409 }
      )
    }
  }

  const updateData: {
    machineId?: string
    marque?: string | null
    modele?: string | null
    numeroSerie?: string | null
    matricule?: string | null
    statut?: 'ACTIF' | 'EN_MAINTENANCE' | 'HORS_SERVICE'
  } = {}

  if (data.machineId !== undefined) updateData.machineId = data.machineId
  if (data.marque !== undefined) updateData.marque = data.marque ? data.marque : null
  if (data.modele !== undefined) updateData.modele = data.modele ? data.modele : null
  if (data.numeroSerie !== undefined) updateData.numeroSerie = data.numeroSerie ? data.numeroSerie : null
  if (data.matricule !== undefined) updateData.matricule = data.matricule ? data.matricule : null
  if (data.statut !== undefined) updateData.statut = data.statut

  const updatedMachine = await db.machine.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(updatedMachine)
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
  const existingMachine = await db.machine.findUnique({
    where: { id },
    include: { documents: true },
  })

  if (!existingMachine) {
    return NextResponse.json({ error: 'Matériel non trouvé' }, { status: 404 })
  }

  for (const doc of existingMachine.documents) {
    try {
      await deleteFile(doc.fileKey)
    } catch (err) {
      console.error(`Failed to delete MinIO file ${doc.fileKey}:`, err)
    }
  }

  await db.machine.delete({
    where: { id },
  })

  return NextResponse.json({ success: true, message: 'Matériel supprimé' })
}
