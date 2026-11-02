import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { getSignedUrl } from '@/lib/minio'
import { z } from 'zod'

const updateClusterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Le nom ne peut pas être vide')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .optional(),
  description: z.string().trim().nullable().optional(),
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

  const cluster = await db.archiveCluster.findUnique({
    where: { id },
    include: {
      children: {
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              documents: true,
              children: true,
            },
          },
        },
      },
      documents: {
        orderBy: { issueDate: 'desc' },
      },
    },
  })

  if (!cluster) {
    return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
  }

  // Build breadcrumbs chain from root to current cluster
  const breadcrumbs: { id: string; name: string }[] = [
    { id: cluster.id, name: cluster.name },
  ]
  let currentParentId = cluster.parentId
  const visited = new Set<string>([cluster.id])

  while (currentParentId && !visited.has(currentParentId)) {
    visited.add(currentParentId)
    const parent = await db.archiveCluster.findUnique({
      where: { id: currentParentId },
      select: { id: true, name: true, parentId: true },
    })
    if (!parent) break
    breadcrumbs.unshift({ id: parent.id, name: parent.name })
    currentParentId = parent.parentId
  }

  // Format documents with signed URLs
  const documents = await Promise.all(
    (cluster.documents || []).map(async (doc: any) => {
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
        issueDate: doc.issueDate instanceof Date ? doc.issueDate.toISOString() : doc.issueDate,
        dueDate: doc.dueDate
          ? doc.dueDate instanceof Date
            ? doc.dueDate.toISOString()
            : doc.dueDate
          : undefined,
        amount: doc.amount != null ? Number(doc.amount) : undefined,
        isPaid: doc.isPaid ?? undefined,
        physicalLocation: doc.physicalLocation,
        notes: doc.notes,
        fileKey: doc.fileKey,
        archiveClusterId: doc.archiveClusterId,
        signedUrl,
        url: signedUrl,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
      }
    })
  )

  const children = (cluster.children || []).map((child: any) => ({
    id: child.id,
    name: child.name,
    description: child.description,
    parentId: child.parentId,
    createdAt: child.createdAt instanceof Date ? child.createdAt.toISOString() : child.createdAt,
    updatedAt: child.updatedAt instanceof Date ? child.updatedAt.toISOString() : child.updatedAt,
    _count: child._count || { documents: 0, children: 0 },
    subClustersCount: child._count?.children || 0,
    documentsCount: child._count?.documents || 0,
  }))

  return NextResponse.json({
    id: cluster.id,
    name: cluster.name,
    description: cluster.description,
    parentId: cluster.parentId,
    createdAt: cluster.createdAt instanceof Date ? cluster.createdAt.toISOString() : cluster.createdAt,
    updatedAt: cluster.updatedAt instanceof Date ? cluster.updatedAt.toISOString() : cluster.updatedAt,
    breadcrumbs,
    children,
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

  const existingCluster = await db.archiveCluster.findUnique({
    where: { id },
  })
  if (!existingCluster) {
    return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
  }

  const validation = updateClusterSchema.safeParse(body)
  if (!validation.success) {
    const issues = validation.error.issues || []
    const errorMessage = issues.map((e) => e.message).join(', ') || 'Données invalides'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }

  const updateData: { name?: string; description?: string | null } = {}
  if (validation.data.name !== undefined) {
    updateData.name = validation.data.name
  }
  if (validation.data.description !== undefined) {
    updateData.description =
      validation.data.description && validation.data.description.trim() !== ''
        ? validation.data.description.trim()
        : null
  }

  const updated = await db.archiveCluster.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(updated, { status: 200 })
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

  const cluster = await db.archiveCluster.findUnique({
    where: { id },
    include: {
      children: { select: { id: true } },
      documents: { select: { id: true } },
    },
  })

  if (!cluster) {
    return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
  }

  const hasChildren = cluster.children && cluster.children.length > 0
  const hasDocuments = cluster.documents && cluster.documents.length > 0

  if (hasChildren || hasDocuments) {
    return NextResponse.json(
      {
        error:
          "Impossible de supprimer ce dossier : il contient encore des documents ou sous-dossiers. Veuillez d'abord les vider ou les déplacer.",
      },
      { status: 400 }
    )
  }

  await db.archiveCluster.delete({
    where: { id },
  })

  return NextResponse.json({ success: true }, { status: 200 })
}
