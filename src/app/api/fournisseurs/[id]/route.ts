import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { getSignedUrl, deleteFile } from '@/lib/minio'
import { z } from 'zod'

const fournisseurUpdateSchema = z.object({
  nom: z.string().trim().min(1, 'Le nom ne peut pas être vide').optional(),
  nif: z.string().trim().nullable().optional(),
  telephone: z.string().trim().nullable().optional(),
  adresse: z.string().trim().nullable().optional(),
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
  const supplier = await db.fournisseur.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!supplier) {
    return NextResponse.json({ error: 'Fournisseur non trouvé' }, { status: 404 })
  }

  const documents = await Promise.all(
    supplier.documents.map(async (doc) => {
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
        amount: doc.amount != null ? Number(doc.amount) : undefined,
        isPaid: doc.isPaid ?? undefined,
        physicalLocation: doc.physicalLocation,
        notes: doc.notes,
        fileKey: doc.fileKey,
        signedUrl,
        url: signedUrl,
        entityName: supplier.nom,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      }
    })
  )

  return NextResponse.json({
    ...supplier,
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
  const existingSupplier = await db.fournisseur.findUnique({
    where: { id },
  })

  if (!existingSupplier) {
    return NextResponse.json({ error: 'Fournisseur non trouvé' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
  }

  const validation = fournisseurUpdateSchema.safeParse(body)
  if (!validation.success) {
    const issues = validation.error.issues || []
    const errorMessage = issues.map((e) => e.message).join(', ') || 'Validation échouée'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }

  const data = validation.data
  const updateData: {
    nom?: string
    nif?: string | null
    telephone?: string | null
    adresse?: string | null
  } = {}

  if (data.nom !== undefined) updateData.nom = data.nom
  if (data.nif !== undefined) updateData.nif = data.nif ? data.nif : null
  if (data.telephone !== undefined) updateData.telephone = data.telephone ? data.telephone : null
  if (data.adresse !== undefined) updateData.adresse = data.adresse ? data.adresse : null

  const updatedSupplier = await db.fournisseur.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(updatedSupplier)
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
  const existingSupplier = await db.fournisseur.findUnique({
    where: { id },
    include: { documents: true },
  })

  if (!existingSupplier) {
    return NextResponse.json({ error: 'Fournisseur non trouvé' }, { status: 404 })
  }

  for (const doc of existingSupplier.documents) {
    try {
      await deleteFile(doc.fileKey)
    } catch (err) {
      console.error(`Failed to delete minio file ${doc.fileKey}:`, err)
    }
  }

  await db.fournisseur.delete({
    where: { id },
  })

  return NextResponse.json({ success: true, message: 'Fournisseur supprimé' })
}
