/**
 * @jest-environment node
 */
import { POST } from './route'

let mockSession: { user: { id: string; email: string; role: string } } | null = null

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => mockSession),
}))

jest.mock('@/lib/minio', () => ({
  getUploadSignedUrl: jest
    .fn()
    .mockImplementation((key: string) => Promise.resolve(`https://r2.storage.mock/upload/${key}`)),
  generateKey: jest.fn((module: string, entityId: string | null, filename: string) =>
    `${module}/${entityId ?? 'global'}/12345-${filename}`
  ),
}))

describe('POST /api/documents/upload-url', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await POST(
      new Request('http://localhost/api/documents/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: 'facture.pdf',
          module: 'CLIENTS',
        }),
      })
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid non-PDF file', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const res = await POST(
      new Request('http://localhost/api/documents/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: 'image.png',
          mimetype: 'image/png',
          module: 'CLIENTS',
        }),
      })
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Seuls les fichiers PDF sont acceptés')
  })

  it('returns uploadUrl and fileKey for valid request', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const res = await POST(
      new Request('http://localhost/api/documents/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: 'contrat.pdf',
          mimetype: 'application/pdf',
          module: 'CLIENTS',
          entityId: 'client-1',
        }),
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.fileKey).toBe('CLIENTS/client-1/12345-contrat.pdf')
    expect(data.uploadUrl).toBe('https://r2.storage.mock/upload/CLIENTS/client-1/12345-contrat.pdf')
  })
})
