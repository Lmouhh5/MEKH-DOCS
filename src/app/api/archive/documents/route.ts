import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { uploadFile, generateKey } from '@/lib/minio'
import { Prisma } from '@prisma/client'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Données multipart invalides' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file || typeof file === 'string' || (file instanceof Blob && file.size === 0)) {
    return NextResponse.json({ error: 'Le fichier est requis' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'Le fichier dépasse la taille maximale autorisée (50 Mo)' },
      { status: 400 }
    )
  }

  const filename = file.name || 'document.pdf'
  const isPdf =
    file.type === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')
  if (!isPdf) {
    return NextResponse.json(
      { error: 'Seuls les fichiers PDF sont acceptés' },
      { status: 400 }
    )
  }

  const title = (formData.get('title') as string || '').trim()
  if (!title) {
    return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 })
  }

  const issueDateStr = (formData.get('issueDate') as string || '').trim()
  if (!issueDateStr) {
    return NextResponse.json({ error: "La date d'émission est requise" }, { status: 400 })
  }
  const parsedIssueDate = new Date(issueDateStr)
  if (isNaN(parsedIssueDate.getTime())) {
    return NextResponse.json({ error: "Date d'émission invalide" }, { status: 400 })
  }

  const archiveClusterId = (formData.get('archiveClusterId') as string || '').trim()
  if (!archiveClusterId) {
    return NextResponse.json({ error: "Le dossier d'archive est requis" }, { status: 400 })
  }

  const cluster = await db.archiveCluster.findUnique({
    where: { id: archiveClusterId },
  })
  if (!cluster) {
    return NextResponse.json({ error: "Dossier d'archive non trouvé" }, { status: 404 })
  }

  const dueDateStr = (formData.get('dueDate') as string || '').trim()
  let parsedDueDate: Date | null = null
  if (dueDateStr) {
    parsedDueDate = new Date(dueDateStr)
    if (isNaN(parsedDueDate.getTime())) {
      return NextResponse.json({ error: "Date d'échéance invalide" }, { status: 400 })
    }
  }

  const amountStr = (formData.get('amount') as string || '').trim()
  let parsedAmount: number | null = null
  if (amountStr) {
    parsedAmount = Number(amountStr)
    if (isNaN(parsedAmount)) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }
  }

  const physicalLocation = (formData.get('physicalLocation') as string || '').trim() || null
  const notes = (formData.get('notes') as string || '').trim() || null

  let buffer: Buffer
  try {
    const arrayBuffer = await file.arrayBuffer()
    buffer = Buffer.from(arrayBuffer)
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la lecture du fichier' }, { status: 500 })
  }

  const fileKey = generateKey('archives', filename)

  try {
    await uploadFile(buffer, fileKey, 'application/pdf')
  } catch {
    return NextResponse.json(
      { error: 'Erreur lors du téléversement vers le stockage' },
      { status: 500 }
    )
  }

  const document = await db.document.create({
    data: {
      module: 'ARCHIVES',
      documentType: 'ARCHIVE_DOCUMENT',
      archiveClusterId,
      fileKey,
      title,
      issueDate: parsedIssueDate,
      dueDate: parsedDueDate,
      amount: parsedAmount != null ? new Prisma.Decimal(parsedAmount) : null,
      physicalLocation,
      notes,
    },
  })

  return NextResponse.json(document, { status: 201 })
}
