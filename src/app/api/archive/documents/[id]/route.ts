import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { deleteFile, getSignedUrl } from '@/lib/minio'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)

  const doc = await db.document.findUnique({
    where: { id },
    include: {
      archiveCluster: true,
    },
  })
  if (!doc) {
    return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
  }

  let signedUrl: string | undefined
  try {
    signedUrl = await getSignedUrl(doc.fileKey)
  } catch (err) {
    console.error(`Failed to get signed URL for document ${id}:`, err)
  }

  return NextResponse.json({
    ...doc,
    signedUrl,
    url: signedUrl,
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)

  const doc = await db.document.findUnique({
    where: { id },
  })
  if (!doc) {
    return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
  }

  if (doc.fileKey) {
    try {
      await deleteFile(doc.fileKey)
    } catch (err) {
      console.error(`Failed to delete MinIO object ${doc.fileKey}:`, err)
    }
  }

  await db.document.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
