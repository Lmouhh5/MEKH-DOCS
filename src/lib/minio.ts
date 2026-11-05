import { Client } from 'minio'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner'

const rawEndpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost'

// Clean hostname for MinIO Client (strip protocol and trailing paths)
let cleanHostname = rawEndpoint.replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
let endpointPort: number | undefined

// Parse port if embedded in endpoint string (e.g., localhost:9000)
if (cleanHostname.includes(':')) {
  const parts = cleanHostname.split(':')
  cleanHostname = parts[0]
  endpointPort = parseInt(parts[1], 10)
}

const isSecure =
  process.env.MINIO_USE_SSL === 'true' ||
  rawEndpoint.startsWith('https://') ||
  cleanHostname.endsWith('r2.cloudflarestorage.com') ||
  cleanHostname.endsWith('amazonaws.com')

const defaultPort = isSecure ? 443 : 9000
const port = process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : (endpointPort || defaultPort)

const accessKey =
  process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY || 'minioadmin'
const secretKey =
  process.env.S3_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY || 'minioadmin'

export const BUCKET =
  process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'erp-documents'

const region =
  process.env.S3_REGION ||
  (cleanHostname.endsWith('r2.cloudflarestorage.com') ? 'auto' : 'us-east-1')

const isLocalhost =
  cleanHostname === 'localhost' || cleanHostname === '127.0.0.1'

const forcePathStyle =
  process.env.S3_FORCE_PATH_STYLE !== undefined
    ? process.env.S3_FORCE_PATH_STYLE === 'true'
    : isLocalhost

const s3Endpoint =
  rawEndpoint.startsWith('http://') || rawEndpoint.startsWith('https://')
    ? (rawEndpoint.endsWith('/') ? rawEndpoint.slice(0, -1) : rawEndpoint)
    : `${isSecure ? 'https' : 'http'}://${cleanHostname}${port !== 80 && port !== 443 ? `:${port}` : ''}`

export const minioClient = new Client({
  endPoint: cleanHostname,
  port: port,
  useSSL: isSecure,
  accessKey: accessKey,
  secretKey: secretKey,
})

export const s3Client = new S3Client({
  endpoint: s3Endpoint,
  region: region,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
  forcePathStyle: forcePathStyle,
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

export function generateKey(module: string, filename: string): string
export function generateKey(module: string, entityId: string | null | undefined, filename: string): string
export function generateKey(
  module: string,
  entityIdOrFilename: string | null | undefined,
  maybeFilename?: string
): string {
  let entityId: string | null | undefined = entityIdOrFilename
  let filename = maybeFilename
  if (maybeFilename === undefined && typeof entityIdOrFilename === 'string') {
    entityId = null
    filename = entityIdOrFilename
  }
  const sanitizedFilename = (filename || 'document.pdf').replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${module}/${entityId ?? 'global'}/${Date.now()}-${sanitizedFilename}`
}
