import { Client } from 'minio'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner'

const endpoint = process.env.MINIO_ENDPOINT || 'localhost'
const port = parseInt(process.env.MINIO_PORT || '9000', 10)
const useSSL = process.env.MINIO_USE_SSL === 'true'
const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin'
const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin'
export const BUCKET = process.env.MINIO_BUCKET || 'erp-documents'

export const minioClient = new Client({
  endPoint: endpoint,
  port: port,
  useSSL: useSSL,
  accessKey: accessKey,
  secretKey: secretKey,
})

const s3Client = new S3Client({
  endpoint: `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
  forcePathStyle: true,
})

export async function uploadFile(buffer: Buffer, key: string, mimetype: string): Promise<void> {
  await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
    'Content-Type': mimetype,
  })
}

export async function getSignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  })
  return getS3SignedUrl(s3Client, command, { expiresIn: 900 })
}

export async function deleteFile(key: string): Promise<void> {
  await minioClient.removeObject(BUCKET, key)
}

export function generateKey(module: string, entityId: string | null | undefined, filename: string): string {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${module}/${entityId ?? 'global'}/${Date.now()}-${sanitizedFilename}`
}
