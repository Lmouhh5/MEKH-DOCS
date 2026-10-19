import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { getSignedUrl } from '@/lib/minio'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)
  const document = await db.document.findUnique({
    where: { id },
  })

  if (!document) {
    return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
  }

  const url = await getSignedUrl(document.fileKey)
  return NextResponse.json({ url })
}
