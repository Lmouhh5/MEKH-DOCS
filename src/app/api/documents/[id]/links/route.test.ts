/**
 * @jest-environment node
 */
import { GET, POST, DELETE } from './route'

let mockSession: { user: { id: string; email: string; role: string } } | null = null

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => mockSession),
}))

jest.mock('@/lib/minio', () => ({
  getSignedUrl: jest
    .fn()
    .mockImplementation((key: string) => Promise.resolve(`http://minio/signed/${key}`)),
}))

interface MockDoc {
  id: string
  title: string
  documentType: string
  module: string
  issueDate: Date
  dueDate: Date | null
  amount: string | null
  isPaid: boolean | null
  fileKey: string
  clientId: string | null
  fournisseurId: string | null
  machineId: string | null
  travailleurId: string | null
  client: { id: string; nom: string } | null
  fournisseur: { id: string; nom: string } | null
  machine: null
  travailleur: null
}

const mockDocs: Record<string, MockDoc> = {
  'doc-A': {
    id: 'doc-A',
    title: 'Bon de Commande #101',
    documentType: 'BON_DE_COMMANDE',
    module: 'FOURNISSEURS',
    issueDate: new Date('2026-03-01T00:00:00.000Z'),
    dueDate: null,
    amount: '50000.00',
    isPaid: null,
    fileKey: 'FOURNISSEURS/f1/bdc.pdf',
    clientId: null,
    fournisseurId: 'f1',
    machineId: null,
    travailleurId: null,
    client: null,
    fournisseur: { id: 'f1', nom: 'Fournisseur Alpha' },
    machine: null,
    travailleur: null,
  },
  'doc-B': {
    id: 'doc-B',
    title: 'Bon de Réception #202',
    documentType: 'BON_DE_RECEPTION',
    module: 'FOURNISSEURS',
    issueDate: new Date('2026-03-05T00:00:00.000Z'),
    dueDate: null,
    amount: null,
    isPaid: null,
    fileKey: 'FOURNISSEURS/f1/bdr.pdf',
    clientId: null,
    fournisseurId: 'f1',
    machineId: null,
    travailleurId: null,
    client: null,
    fournisseur: { id: 'f1', nom: 'Fournisseur Alpha' },
    machine: null,
    travailleur: null,
  },
  'doc-C': {
    id: 'doc-C',
    title: 'Facture Achat #303',
    documentType: 'FACTURE_ACHAT',
    module: 'FOURNISSEURS',
    issueDate: new Date('2026-03-10T00:00:00.000Z'),
    dueDate: new Date('2026-04-10T00:00:00.000Z'),
    amount: '50000.00',
    isPaid: false,
    fileKey: 'FOURNISSEURS/f1/facture.pdf',
    clientId: null,
    fournisseurId: 'f1',
    machineId: null,
    travailleurId: null,
    client: null,
    fournisseur: { id: 'f1', nom: 'Fournisseur Alpha' },
    machine: null,
    travailleur: null,
  },
}

let mockLinks: Array<{ id: string; documentAId: string; documentBId: string; createdAt: Date }> = []

interface LinkWhere {
  OR?: Array<{ documentAId?: string; documentBId?: string }>
  documentAId?: string
}

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    document: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        return mockDocs[where.id] || null
      }),
      findMany: jest.fn(async ({ where }: { where: { id: { in: string[] } } }) => {
        const ids = where.id?.in || []
        return ids.map((id: string) => mockDocs[id]).filter(Boolean)
      }),
    },
    documentLink: {
      findMany: jest.fn(async ({ where }: { where: LinkWhere }) => {
        const id = where.OR?.[0]?.documentAId || where.documentAId
        return mockLinks.filter(
          (l) => l.documentAId === id || l.documentBId === id
        )
      }),
      findFirst: jest.fn(async ({ where }: { where: { OR?: Array<{ documentAId: string; documentBId: string }> } }) => {
        if (where.OR) {
          const [cond1, cond2] = where.OR
          return (
            mockLinks.find(
              (l) =>
                (l.documentAId === cond1.documentAId && l.documentBId === cond1.documentBId) ||
                (l.documentAId === cond2.documentAId && l.documentBId === cond2.documentBId)
            ) || null
          )
        }
        return null
      }),
      create: jest.fn(async ({ data }: { data: { documentAId: string; documentBId: string } }) => {
        const newLink = {
          id: `link-${Date.now()}-${Math.random()}`,
          documentAId: data.documentAId,
          documentBId: data.documentBId,
          createdAt: new Date(),
        }
        mockLinks.push(newLink)
        return newLink
      }),
      deleteMany: jest.fn(async ({ where }: { where: { OR?: Array<{ documentAId: string; documentBId: string }> } }) => {
        const initialLen = mockLinks.length
        if (where.OR) {
          const [c1, c2] = where.OR
          mockLinks = mockLinks.filter(
            (l) =>
              !(
                (l.documentAId === c1.documentAId && l.documentBId === c1.documentBId) ||
                (l.documentAId === c2.documentAId && l.documentBId === c2.documentBId)
              )
          )
        }
        return { count: initialLen - mockLinks.length }
      }),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        const idx = mockLinks.findIndex((l) => l.id === where.id)
        if (idx !== -1) {
          const [deleted] = mockLinks.splice(idx, 1)
          return deleted
        }
        throw new Error('Record not found')
      }),
    },
  },
}))

function authenticatedRequest(url: string, options?: RequestInit) {
  mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
  return new Request(`http://localhost${url}`, options)
}

describe('API /api/documents/[id]/links', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
    mockLinks = []
  })

  describe('GET', () => {
    it('returns 401 without session', async () => {
      const res = await GET(new Request('http://localhost/api/documents/doc-A/links'), {
        params: { id: 'doc-A' },
      })
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBe('Non autorisé')
    })

    it('returns linked documents in both directions (symmetric)', async () => {
      // Create link A -> B
      mockLinks.push({
        id: 'link-1',
        documentAId: 'doc-A',
        documentBId: 'doc-B',
        createdAt: new Date(),
      })

      // Query from A: should find B
      const resA = await GET(authenticatedRequest('/api/documents/doc-A/links'), {
        params: { id: 'doc-A' },
      })
      expect(resA.status).toBe(200)
      const dataA = await resA.json()
      expect(Array.isArray(dataA)).toBe(true)
      expect(dataA.length).toBe(1)
      expect(dataA[0].id).toBe('doc-B')
      expect(dataA[0].title).toBe('Bon de Réception #202')
      expect(dataA[0].signedUrl).toBe('http://minio/signed/FOURNISSEURS/f1/bdr.pdf')

      // Query from B: should find A (symmetric)
      const resB = await GET(authenticatedRequest('/api/documents/doc-B/links'), {
        params: { id: 'doc-B' },
      })
      expect(resB.status).toBe(200)
      const dataB = await resB.json()
      expect(Array.isArray(dataB)).toBe(true)
      expect(dataB.length).toBe(1)
      expect(dataB[0].id).toBe('doc-A')
      expect(dataB[0].title).toBe('Bon de Commande #101')
      expect(dataB[0].signedUrl).toBe('http://minio/signed/FOURNISSEURS/f1/bdc.pdf')
    })

    it('returns empty array when document has no links', async () => {
      const res = await GET(authenticatedRequest('/api/documents/doc-C/links'), {
        params: { id: 'doc-C' },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual([])
    })
  })

  describe('POST', () => {
    it('returns 401 without session', async () => {
      const res = await POST(
        new Request('http://localhost/api/documents/doc-A/links', {
          method: 'POST',
          body: JSON.stringify({ targetId: 'doc-B' }),
        }),
        { params: { id: 'doc-A' } }
      )
      expect(res.status).toBe(401)
    })

    it('returns 400 when targetId is missing or equal to id', async () => {
      // Missing targetId
      const resMissing = await POST(
        authenticatedRequest('/api/documents/doc-A/links', {
          method: 'POST',
          body: JSON.stringify({}),
        }),
        { params: { id: 'doc-A' } }
      )
      expect(resMissing.status).toBe(400)

      // Same id
      const resSame = await POST(
        authenticatedRequest('/api/documents/doc-A/links', {
          method: 'POST',
          body: JSON.stringify({ targetId: 'doc-A' }),
        }),
        { params: { id: 'doc-A' } }
      )
      expect(resSame.status).toBe(400)
    })

    it('returns 404 when target document does not exist', async () => {
      const res = await POST(
        authenticatedRequest('/api/documents/doc-A/links', {
          method: 'POST',
          body: JSON.stringify({ targetId: 'doc-nonexistent' }),
        }),
        { params: { id: 'doc-A' } }
      )
      expect(res.status).toBe(404)
    })

    it('returns 409 when documents are already linked in either direction', async () => {
      mockLinks.push({
        id: 'link-1',
        documentAId: 'doc-A',
        documentBId: 'doc-B',
        createdAt: new Date(),
      })

      // Try linking A -> B again
      const resSameDir = await POST(
        authenticatedRequest('/api/documents/doc-A/links', {
          method: 'POST',
          body: JSON.stringify({ targetId: 'doc-B' }),
        }),
        { params: { id: 'doc-A' } }
      )
      expect(resSameDir.status).toBe(409)
      const jsonSame = await resSameDir.json()
      expect(jsonSame.error).toBe('Ces documents sont déjà liés')

      // Try linking B -> A (reverse direction)
      const resRevDir = await POST(
        authenticatedRequest('/api/documents/doc-B/links', {
          method: 'POST',
          body: JSON.stringify({ targetId: 'doc-A' }),
        }),
        { params: { id: 'doc-B' } }
      )
      expect(resRevDir.status).toBe(409)
      const jsonRev = await resRevDir.json()
      expect(jsonRev.error).toBe('Ces documents sont déjà liés')
    })

    it('creates link successfully and returns 201', async () => {
      const res = await POST(
        authenticatedRequest('/api/documents/doc-A/links', {
          method: 'POST',
          body: JSON.stringify({ targetId: 'doc-B' }),
        }),
        { params: { id: 'doc-A' } }
      )
      expect(res.status).toBe(201)
      expect(mockLinks.length).toBe(1)
      expect(mockLinks[0].documentAId).toBe('doc-A')
      expect(mockLinks[0].documentBId).toBe('doc-B')
    })
  })

  describe('DELETE', () => {
    it('returns 401 without session', async () => {
      const res = await DELETE(
        new Request('http://localhost/api/documents/doc-A/links?targetId=doc-B', {
          method: 'DELETE',
        }),
        { params: { id: 'doc-A' } }
      )
      expect(res.status).toBe(401)
    })

    it('returns 400 when targetId is missing', async () => {
      const res = await DELETE(
        authenticatedRequest('/api/documents/doc-A/links', {
          method: 'DELETE',
        }),
        { params: { id: 'doc-A' } }
      )
      expect(res.status).toBe(400)
    })

    it('deletes link when targetId provided in query param or body', async () => {
      mockLinks.push({
        id: 'link-1',
        documentAId: 'doc-A',
        documentBId: 'doc-B',
        createdAt: new Date(),
      })

      // Delete via query param from B side (symmetric deletion)
      const resB = await DELETE(
        authenticatedRequest('/api/documents/doc-B/links?targetId=doc-A', {
          method: 'DELETE',
        }),
        { params: { id: 'doc-B' } }
      )
      expect(resB.status).toBe(200)
      expect(mockLinks.length).toBe(0)

      // Add link back
      mockLinks.push({
        id: 'link-2',
        documentAId: 'doc-A',
        documentBId: 'doc-B',
        createdAt: new Date(),
      })

      // Delete via JSON body from A side
      const resA = await DELETE(
        authenticatedRequest('/api/documents/doc-A/links', {
          method: 'DELETE',
          body: JSON.stringify({ targetId: 'doc-B' }),
        }),
        { params: { id: 'doc-A' } }
      )
      expect(resA.status).toBe(200)
      expect(mockLinks.length).toBe(0)
    })

    it('returns 404 when link does not exist', async () => {
      const res = await DELETE(
        authenticatedRequest('/api/documents/doc-A/links?targetId=doc-C', {
          method: 'DELETE',
        }),
        { params: { id: 'doc-A' } }
      )
      expect(res.status).toBe(404)
    })
  })
})
