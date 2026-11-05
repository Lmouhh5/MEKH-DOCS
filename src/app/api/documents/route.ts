import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { uploadFile, getSignedUrl, generateKey, deleteFile } from '@/lib/minio'
import { DOCUMENT_TYPES_BY_MODULE, DocumentTypeKey, ModuleKey } from '@/lib/constants'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const VALID_MODULES = [
  'CLIENTS',
  'FOURNISSEURS',
  'MATERIEL',
  'PERSONNEL',
  'TRESORERIE',
  'FISCALITE',
] as const

const documentSchema = z
  .object({
    title: z.string().trim().min(1, 'Le titre est requis'),
    module: z.enum(VALID_MODULES, {
      message: 'Module invalide',
    }),
    documentType: z.string().trim().min(1, 'Le type de document est requis'),
    issueDate: z.string().trim().min(1, "La date d'émission est requise"),
    dueDate: z.string().nullable().optional(),
    amount: z.string().nullable().optional(),
    isPaid: z.union([z.boolean(), z.string()]).nullable().optional(),
    notes: z.string().nullable().optional(),
    physicalLocation: z.string().nullable().optional(),
    clientId: z.string().nullable().optional(),
    fournisseurId: z.string().nullable().optional(),
    machineId: z.string().nullable().optional(),
    travailleurId: z.string().nullable().optional(),
    entityId: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const allowedTypes = DOCUMENT_TYPES_BY_MODULE[data.module as ModuleKey]
    if (!allowedTypes || !allowedTypes.includes(data.documentType as DocumentTypeKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Type de document non valide pour ce module',
        path: ['documentType'],
      })
    }

    if (
      (data.documentType === 'ASSURANCE' || data.documentType === 'CONTROLE_TECHNIQUE') &&
      (!data.dueDate || data.dueDate.trim() === '')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date d'échéance est requise pour ce type de document",
        path: ['dueDate'],
      })
    }

    const parsedIssue = new Date(data.issueDate)
    if (isNaN(parsedIssue.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date d'émission invalide",
        path: ['issueDate'],
      })
    }

    if (data.dueDate && data.dueDate.trim() !== '') {
      const parsedDue = new Date(data.dueDate)
      if (isNaN(parsedDue.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date d'échéance invalide",
          path: ['dueDate'],
        })
      }
    }

    if (data.amount && data.amount.trim() !== '') {
      const parsedAmount = Number(data.amount)
      if (isNaN(parsedAmount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Montant invalide',
          path: ['amount'],
        })
      }
    }
  })

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
  let rawData: Record<string, unknown> = {}

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
    rawData = json
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

    rawData = {
      title: (formData.get('title') as string) || '',
      module: (formData.get('module') as string) || '',
      documentType: (formData.get('documentType') as string) || '',
      issueDate: (formData.get('issueDate') as string) || '',
      dueDate: (formData.get('dueDate') as string) || null,
      amount: (formData.get('amount') as string) || null,
      isPaid: formData.get('isPaid') as string | null,
      notes: (formData.get('notes') as string) || null,
      physicalLocation: (formData.get('physicalLocation') as string) || null,
      clientId: (formData.get('clientId') as string) || null,
      fournisseurId: (formData.get('fournisseurId') as string) || null,
      machineId: (formData.get('machineId') as string) || null,
      travailleurId: (formData.get('travailleurId') as string) || null,
      entityId: (formData.get('entityId') as string) || null,
    }
  }

  if (
    !preUploadedKey &&
    (!file || typeof file === 'string' || (file instanceof Blob && file.size === 0))
  ) {
    return NextResponse.json({ error: 'Le fichier est requis' }, { status: 400 })
  }

  const MAX_FILE_SIZE = 25 * 1024 * 1024
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'Le fichier dépasse la taille maximale autorisée (25 Mo)' },
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

  const result = documentSchema.safeParse(rawData)
  if (!result.success) {
    const issues = result.error.issues || []
    const firstError = issues[0]?.message || 'Validation échouée'
    return NextResponse.json({ error: firstError }, { status: 400 })
  }

  const data = result.data

  const finalClientId =
    data.module === 'CLIENTS' ? (data.clientId || data.entityId || null) : null
  const finalFournisseurId =
    data.module === 'FOURNISSEURS'
      ? (data.fournisseurId || data.entityId || null)
      : null
  const finalMachineId =
    data.module === 'MATERIEL' ? (data.machineId || data.entityId || null) : null
  const finalTravailleurId =
    data.module === 'PERSONNEL'
      ? (data.travailleurId || data.entityId || null)
      : null

  const keyEntityId =
    finalClientId ||
    finalFournisseurId ||
    finalMachineId ||
    finalTravailleurId ||
    data.entityId ||
    null

  let key = preUploadedKey
  if (!key) {
    key = generateKey(data.module, keyEntityId, filename)

    let buffer: Buffer
    try {
      const arrayBuffer = await file!.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } catch {
      return NextResponse.json({ error: 'Erreur lors de la lecture du fichier' }, { status: 500 })
    }

    try {
      await uploadFile(buffer, key, mimetype)
    } catch {
      return NextResponse.json(
        { error: 'Erreur lors du téléversement vers le stockage' },
        { status: 500 }
      )
    }
  }

  const parsedDueDate =
    data.dueDate && data.dueDate.trim() !== '' ? new Date(data.dueDate) : null
  const parsedAmount =
    data.amount && data.amount.trim() !== '' ? new Prisma.Decimal(data.amount) : null
  const parsedIsPaid =
    typeof data.isPaid === 'boolean'
      ? data.isPaid
      : data.isPaid === 'true'
      ? true
      : data.isPaid === 'false'
      ? false
      : data.documentType === 'FACTURE_VENTE' || data.documentType === 'FACTURE_ACHAT'
      ? false
      : null

  let document
  try {
    document = await db.document.create({
      data: {
        title: data.title,
        documentType: data.documentType as DocumentTypeKey,
        module: data.module as ModuleKey,
        issueDate: new Date(data.issueDate),
        dueDate: parsedDueDate,
        amount: parsedAmount,
        isPaid: parsedIsPaid,
        physicalLocation: data.physicalLocation || null,
        notes: data.notes || null,
        fileKey: key,
        clientId: finalClientId,
        fournisseurId: finalFournisseurId,
        machineId: finalMachineId,
        travailleurId: finalTravailleurId,
      },
    })
  } catch {
    await deleteFile(key).catch(() => {})
    return NextResponse.json(
      { error: 'Erreur lors de la création du document en base de données' },
      { status: 500 }
    )
  }

  const signedUrl = await getSignedUrl(document.fileKey)
  const documentWithoutKey = { ...document }
  delete (documentWithoutKey as Partial<typeof document>).fileKey

  return NextResponse.json(
    {
      ...documentWithoutKey,
      signedUrl,
      url: signedUrl,
    },
    { status: 201 }
  )
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const moduleParam = searchParams.get('module')
  const clientId = searchParams.get('clientId')
  const fournisseurId = searchParams.get('fournisseurId')
  const machineId = searchParams.get('machineId')
  const travailleurId = searchParams.get('travailleurId')

  const where: Prisma.DocumentWhereInput = {}
  if (moduleParam) where.module = moduleParam as ModuleKey
  if (clientId) where.clientId = clientId
  if (fournisseurId) where.fournisseurId = fournisseurId
  if (machineId) where.machineId = machineId
  if (travailleurId) where.travailleurId = travailleurId

  const documents = await db.document.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  const docsWithSignedUrls = await Promise.all(
    documents.map(async (doc) => {
      const signedUrl = await getSignedUrl(doc.fileKey)
      const documentWithoutKey = { ...doc }
      delete (documentWithoutKey as Partial<typeof doc>).fileKey
      return { ...documentWithoutKey, signedUrl, url: signedUrl }
    })
  )

  return NextResponse.json(docsWithSignedUrls)
}
