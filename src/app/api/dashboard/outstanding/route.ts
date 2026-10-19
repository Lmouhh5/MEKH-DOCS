import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { getSignedUrl } from '@/lib/minio'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const documents = await db.document.findMany({
    where: {
      isPaid: false,
      module: { in: ['CLIENTS', 'FOURNISSEURS'] },
    },
    include: {
      client: true,
      fournisseur: true,
    },
    orderBy: {
      issueDate: 'asc',
    },
  })

  const results = await Promise.all(
    documents.map(async (doc) => {
      let signedUrl = ''
      try {
        signedUrl = await getSignedUrl(doc.fileKey)
      } catch {
        // Fallback if storage is unreachable
      }

      const numAmount = doc.amount != null ? Number(doc.amount) : null
      const formattedAmount =
        numAmount != null
          ? `${numAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD`
          : '-'

      const entityName = doc.client?.nom || doc.fournisseur?.nom || undefined

      const issueDateStr =
        doc.issueDate instanceof Date
          ? doc.issueDate.toISOString()
          : new Date(doc.issueDate).toISOString()
      const dueDateStr = doc.dueDate
        ? doc.dueDate instanceof Date
          ? doc.dueDate.toISOString()
          : new Date(doc.dueDate).toISOString()
        : null
      const createdAtStr =
        doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : new Date(doc.createdAt).toISOString()
      const updatedAtStr =
        doc.updatedAt instanceof Date
          ? doc.updatedAt.toISOString()
          : new Date(doc.updatedAt).toISOString()

      return {
        id: doc.id,
        title: doc.title,
        documentType: doc.documentType,
        module: doc.module,
        issueDate: issueDateStr,
        dueDate: dueDateStr,
        amount: numAmount,
        formattedAmount,
        isPaid: doc.isPaid,
        physicalLocation: doc.physicalLocation || null,
        notes: doc.notes || null,
        clientId: doc.clientId || null,
        fournisseurId: doc.fournisseurId || null,
        entityName,
        client: doc.client || null,
        fournisseur: doc.fournisseur || null,
        signedUrl,
        url: signedUrl,
        createdAt: createdAtStr,
        updatedAt: updatedAtStr,
      }
    })
  )

  return NextResponse.json(results, { status: 200 })
}
