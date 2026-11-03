import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { z } from 'zod'

const createClusterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  parentId: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
})

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const parentId = searchParams.get('parentId')
  const isTree = searchParams.get('tree') === 'true'

  const allClusters = await db.archiveCluster.findMany({
    include: {
      documents: {
        select: {
          id: true,
          issueDate: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Index clusters by id and children by parentId
  const clusterById = new Map<string, (typeof allClusters)[0]>()
  const childrenByParent = new Map<string | null, typeof allClusters>()

  for (const c of allClusters) {
    clusterById.set(c.id, c)
    const p = c.parentId ?? null
    if (!childrenByParent.has(p)) {
      childrenByParent.set(p, [])
    }
    childrenByParent.get(p)!.push(c)
  }

  // If tree requested, return full nested tree structure
  if (isTree) {
    const buildTree = (pId: string | null = null): Record<string, unknown>[] => {
      const children = childrenByParent.get(pId) || []
      return children.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        parentId: c.parentId,
        createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
        updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
        _count: {
          documents: c.documents?.length || 0,
          children: childrenByParent.get(c.id)?.length || 0,
        },
        children: buildTree(c.id),
      }))
    }

    return NextResponse.json(buildTree(null))
  }

  // Helper to collect all descendants (self + all subclusters recursively)
  function getDescendants(clusterId: string): typeof allClusters {
    const list: typeof allClusters = []
    const visited = new Set<string>([clusterId])
    const stack = [clusterId]

    const root = clusterById.get(clusterId)
    if (root) list.push(root)

    while (stack.length > 0) {
      const currentId = stack.pop()!
      const directChildren = childrenByParent.get(currentId) || []
      for (const child of directChildren) {
        if (!visited.has(child.id)) {
          visited.add(child.id)
          list.push(child)
          stack.push(child.id)
        }
      }
    }
    return list
  }

  // Determine which clusters to return (root clusters or direct children of parentId)
  let targetClusters: typeof allClusters
  if (!parentId || parentId === 'root') {
    targetClusters = allClusters.filter((c) => !c.parentId)
  } else {
    targetClusters = allClusters.filter((c) => c.parentId === parentId)
  }

  const result = targetClusters.map((cluster) => {
    const allFamily = getDescendants(cluster.id)
    let totalDocumentsCount = 0
    let latestDate: Date | null = null

    for (const member of allFamily) {
      const docs = member.documents || []
      totalDocumentsCount += docs.length
      for (const doc of docs) {
        const d = new Date(doc.issueDate)
        if (!isNaN(d.getTime())) {
          if (!latestDate || d > latestDate) {
            latestDate = d
          }
        }
      }
    }

    const subClustersCount = childrenByParent.get(cluster.id)?.length || 0

    return {
      id: cluster.id,
      name: cluster.name,
      description: cluster.description,
      parentId: cluster.parentId,
      subClustersCount,
      totalDocumentsCount,
      lastDocumentDate: latestDate ? latestDate.toISOString() : null,
      createdAt: cluster.createdAt instanceof Date ? cluster.createdAt.toISOString() : cluster.createdAt,
      updatedAt: cluster.updatedAt instanceof Date ? cluster.updatedAt.toISOString() : cluster.updatedAt,
      _count: {
        documents: cluster.documents?.length || 0,
        children: subClustersCount,
      },
    }
  })

  return NextResponse.json(result)
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

  const validation = createClusterSchema.safeParse(body)
  if (!validation.success) {
    const issues = validation.error.issues || []
    const errorMessage = issues.map((e) => e.message).join(', ') || 'Données invalides'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }

  const name = validation.data.name
  const parentId =
    validation.data.parentId && validation.data.parentId.trim() !== ''
      ? validation.data.parentId.trim()
      : null
  const description =
    validation.data.description && validation.data.description.trim() !== ''
      ? validation.data.description.trim()
      : null

  if (parentId) {
    const parent = await db.archiveCluster.findUnique({
      where: { id: parentId },
    })
    if (!parent) {
      return NextResponse.json({ error: 'Dossier parent non trouvé' }, { status: 404 })
    }
  }

  const cluster = await db.archiveCluster.create({
    data: {
      name,
      parentId,
      description,
    },
  })

  return NextResponse.json(cluster, { status: 201 })
}
