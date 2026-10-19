import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)

  const existing = await db.manualDeadline.findUnique({
    where: { id },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Échéance non trouvée' }, { status: 404 })
  }

  await db.manualDeadline.delete({
    where: { id },
  })

  return NextResponse.json({ message: 'Échéance supprimée' }, { status: 200 })
}
