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

  const contentType = req.headers.get('content-type') || ''
  let file: File | null = null
  let preUploadedKey: string | null = null
  let filename = 'document.pdf'
  let mimetype = 'application/pdf'
  let fileSize = 0

  let title = ''
  let issueDateStr = ''
  let archiveClusterId = ''
  let dueDateStr = ''
  let amountStr = ''
  let physicalLocation: string | null = null
  let notes: string | null = null

  if (contentType.includes('application/json')) {
    let json: Record<string, unknown>
    try {
      json = await req.json()
    } catch {
      return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
    }

    preUploadedKey = (json.fileKey as string) || null
    filename = (json.filename as string) || (json.originalFilename as string) || 'document.pdf'
    mimetype = (json.mimetype as string) || 'application/pdf'
    fileSize = typeof json.fileSize === 'number' ? json.fileSize : parseInt((json.fileSize as string) || '0', 10)

    title = ((json.title as string) || '').trim()
    issueDateStr = ((json.issueDate as string) || '').trim()
    archiveClusterId = ((json.archiveClusterId as string) || '').trim()
    dueDateStr = ((json.dueDate as string) || '').trim()
    amountStr = ((json.amount as string) || '').trim()
    physicalLocation = ((json.physicalLocation as string) || '').trim() || null
    notes = ((json.notes as string) || '').trim() || null
  } else {
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Données multipart invalides' }, { status: 400 })
    }

    preUploadedKey = (formData.get('fileKey') as string) || null
    file = formData.get('file') as File | null

    if (preUploadedKey) {
      filename =
        (formData.get('filename') as string) ||
        (formData.get('originalFilename') as string) ||
        'document.pdf'
      mimetype = (formData.get('mimetype') as string) || 'application/pdf'
      fileSize = parseInt((formData.get('fileSize') as string) || '0', 10)
    } else if (file && typeof file !== 'string' && (!(file instanceof Blob) || file.size > 0)) {
      filename = file.name || 'document.pdf'
      mimetype = file.type || 'application/pdf'
      fileSize = file.size
    }

    title = ((formData.get('title') as string) || '').trim()
    issueDateStr = ((formData.get('issueDate') as string) || '').trim()
    archiveClusterId = ((formData.get('archiveClusterId') as string) || '').trim()
    dueDateStr = ((formData.get('dueDate') as string) || '').trim()
    amountStr = ((formData.get('amount') as string) || '').trim()
    physicalLocation = ((formData.get('physicalLocation') as string) || '').trim() || null
    notes = ((formData.get('notes') as string) || '').trim() || null
  }

  if (
    !preUploadedKey &&
    (!file || typeof file === 'string' || (file instanceof Blob && file.size === 0))
  ) {
    return NextResponse.json({ error: 'Le fichier est requis' }, { status: 400 })
  }

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'Le fichier dépasse la taille maximale autorisée (50 Mo)' },
      { status: 400 }
    )
  }

  const isPdf =
    mimetype === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')
  if (!isPdf) {
    return NextResponse.json(
      { error: 'Seuls les fichiers PDF sont acceptés' },
      { status: 400 }
    )
  }

  if (!title) {
    return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 })
  }

  if (!issueDateStr) {
    return NextResponse.json({ error: "La date d'émission est requise" }, { status: 400 })
  }
  const parsedIssueDate = new Date(issueDateStr)
  if (isNaN(parsedIssueDate.getTime())) {
    return NextResponse.json({ error: "Date d'émission invalide" }, { status: 400 })
  }

  if (!archiveClusterId) {
    return NextResponse.json({ error: "Le dossier d'archive est requis" }, { status: 400 })
  }

  const cluster = await db.archiveCluster.findUnique({
    where: { id: archiveClusterId },
  })
  if (!cluster) {
    return NextResponse.json({ error: "Dossier d'archive non trouvé" }, { status: 404 })
  }

  let parsedDueDate: Date | null = null
  if (dueDateStr) {
    parsedDueDate = new Date(dueDateStr)
    if (isNaN(parsedDueDate.getTime())) {
      return NextResponse.json({ error: "Date d'échéance invalide" }, { status: 400 })
    }
  }

  let parsedAmount: number | null = null
  if (amountStr) {
    parsedAmount = Number(amountStr)
    if (isNaN(parsedAmount)) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }
  }

  let fileKey = preUploadedKey
  if (!fileKey) {
    let buffer: Buffer
    try {
      const arrayBuffer = await file!.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } catch {
      return NextResponse.json({ error: 'Erreur lors de la lecture du fichier' }, { status: 500 })
    }

    fileKey = generateKey('archives', filename)

    try {
      await uploadFile(buffer, fileKey, mimetype)
    } catch {
      return NextResponse.json(
        { error: 'Erreur lors du téléversement vers le stockage' },
        { status: 500 }
      )
    }
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
