import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { getSignedUrl } from '@/lib/minio'
import { DocumentType, Module, Prisma } from '@prisma/client'

function getEntityName(doc: {
  client?: { nom: string } | null
  fournisseur?: { nom: string } | null
  machine?: { machineId?: string | null; marque?: string | null; matricule?: string | null } | null
  travailleur?: { nom: string } | null
}): string | undefined {
  if (doc.client?.nom) return doc.client.nom
  if (doc.fournisseur?.nom) return doc.fournisseur.nom
  if (doc.machine) {
    if (doc.machine.machineId && doc.machine.marque) {
      return `${doc.machine.machineId} - ${doc.machine.marque}`
    }
    return doc.machine.machineId || doc.machine.marque || doc.machine.matricule || undefined
  }
  if (doc.travailleur?.nom) return doc.travailleur.nom
  return undefined
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const entity = searchParams.get('entity')?.trim()
  const from = searchParams.get('from')?.trim()
  const to = searchParams.get('to')?.trim()
  const type = searchParams.get('type')?.trim()
  const moduleParam = searchParams.get('module')?.trim()

  const where: Prisma.DocumentWhereInput = {}

  if (type) {
    where.documentType = type as DocumentType
  }

  if (moduleParam) {
    where.module = moduleParam as Module
  }

  if (from || to) {
    const issueDateFilter: Prisma.DateTimeFilter = {}
    if (from) {
      const fromDate = new Date(from)
      if (!isNaN(fromDate.getTime())) {
        issueDateFilter.gte = fromDate
      }
    }
    if (to) {
      const toDate = to.length === 10 ? new Date(`${to}T23:59:59.999Z`) : new Date(to)
      if (!isNaN(toDate.getTime())) {
        issueDateFilter.lte = toDate
      }
    }
    if (Object.keys(issueDateFilter).length > 0) {
      where.issueDate = issueDateFilter
    }
  }

  if (entity) {
    where.OR = [
      { title: { contains: entity, mode: 'insensitive' } },
      { client: { nom: { contains: entity, mode: 'insensitive' } } },
      { fournisseur: { nom: { contains: entity, mode: 'insensitive' } } },
      { machine: { machineId: { contains: entity, mode: 'insensitive' } } },
      { machine: { marque: { contains: entity, mode: 'insensitive' } } },
      { machine: { matricule: { contains: entity, mode: 'insensitive' } } },
      { travailleur: { nom: { contains: entity, mode: 'insensitive' } } },
    ]
  }

  const documents = await db.document.findMany({
    where,
    include: {
      client: true,
      fournisseur: true,
      machine: true,
      travailleur: true,
    },
    orderBy: {
      issueDate: 'desc',
    },
  })

  const results = await Promise.all(
    documents.map(async (doc) => {
      let signedUrl = ''
      try {
        signedUrl = await getSignedUrl(doc.fileKey)
      } catch {
        // Continue if storage is unreachable
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
