import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUploadSignedUrl, generateKey } from '@/lib/minio'
import { z } from 'zod'

const uploadUrlSchema = z.object({
  filename: z.string().trim().min(1, 'Le nom de fichier est requis'),
  mimetype: z.string().trim().optional().default('application/pdf'),
  module: z.string().trim().min(1, 'Le module est requis'),
  entityId: z.string().nullable().optional(),
})

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

  const result = uploadUrlSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || 'Validation échouée' },
      { status: 400 }
    )
  }

  const { filename, mimetype, module, entityId } = result.data

  const isPdf =
    mimetype === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')
  if (!isPdf) {
    return NextResponse.json(
      { error: 'Seuls les fichiers PDF sont acceptés' },
      { status: 400 }
    )
  }

  try {
    const fileKey = generateKey(module, entityId ?? null, filename)
    const uploadUrl = await getUploadSignedUrl(fileKey, mimetype || 'application/pdf')

    return NextResponse.json({
      uploadUrl,
      fileKey,
    })
  } catch (err) {
    console.error('Failed to generate upload signed URL:', err)
    return NextResponse.json(
      { error: "Erreur lors de la génération de l'URL de téléversement" },
      { status: 500 }
    )
  }
}
