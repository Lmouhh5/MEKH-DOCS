/**
 * @jest-environment node
 */
import { GET } from './route'
import { getSignedUrl } from '@/lib/minio'

let mockSession: { user: { id: string; email: string; role: string } } | null = null

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => mockSession),
}))

jest.mock('@/lib/minio', () => ({
  getSignedUrl: jest
    .fn()
    .mockImplementation((key: string) => Promise.resolve(`http://minio/signed/${key}`)),
}))

const mockDocumentRecord = {
  id: 'doc-123',
  title: 'Test Doc',
  fileKey: 'MATERIEL/machine-1/sample.pdf',
}

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    document: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.id === 'doc-123') return mockDocumentRecord
        return null
      }),
    },
  },
}))

describe('GET /api/documents/[id]/signed-url', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  it('returns 401 without session', async () => {
    const res = await GET(new Request('http://localhost/api/documents/doc-123/signed-url'), {
      params: { id: 'doc-123' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 if document is not found', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const res = await GET(new Request('http://localhost/api/documents/unknown/signed-url'), {
      params: { id: 'unknown' },
    })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Document non trouvé')
  })

  it('returns 200 with fresh signed URL for existing document', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const res = await GET(new Request('http://localhost/api/documents/doc-123/signed-url'), {
      params: { id: 'doc-123' },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBe('http://minio/signed/MATERIEL/machine-1/sample.pdf')
    expect(getSignedUrl).toHaveBeenCalledWith('MATERIEL/machine-1/sample.pdf')
  })
})
