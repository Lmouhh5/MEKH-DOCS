import 'dotenv/config'
import bcrypt from 'bcryptjs'
import db from '../src/lib/db'

export async function seed() {
  const hashedPassword = await bcrypt.hash('admin123', 12)

  const admin = await db.user.upsert({
    where: { email: 'admin@erp.local' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      email: 'admin@erp.local',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  return admin
}

if (require.main === module) {
  seed()
    .then(async () => {
      try {
        const { Client } = await import('minio')
        const endpoint = process.env.MINIO_ENDPOINT || 'localhost'
        const port = parseInt(process.env.MINIO_PORT || '9000', 10)
        const useSSL = process.env.MINIO_USE_SSL === 'true'
        const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin'
        const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin'
        const bucket = process.env.MINIO_BUCKET || 'erp-documents'

        const client = new Client({
          endPoint: endpoint,
          port,
          useSSL,
          accessKey,
          secretKey,
        })

        const exists = await client.bucketExists(bucket)
        if (!exists) {
          await client.makeBucket(bucket, 'us-east-1')
          console.log(`Bucket MinIO '${bucket}' créé avec succès.`)
        } else {
          console.log(`Bucket MinIO '${bucket}' déjà existant.`)
        }
      } catch (err) {
        console.warn('Avertissement: Impossible de vérifier/créer le bucket MinIO:', err)
      }
      console.log('Seeding completed successfully.')
    })
    .catch((e) => {
      console.error('Seeding error:', e)
      process.exit(1)
    })
    .finally(async () => {
      await db.$disconnect()
    })
}
