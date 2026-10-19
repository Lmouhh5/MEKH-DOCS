/**
 * @jest-environment node
 */
import { GET, PATCH, DELETE } from './route'
import db from '@/lib/db'

let mockSession: { user: { id: string; email: string; role: string } } | null = null

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => mockSession),
}))

jest.mock('@/lib/minio', () => ({
  getSignedUrl: jest
    .fn()
    .mockImplementation((key: string) => Promise.resolve(`http://minio/signed/${key}`)),
  deleteFile: jest.fn().mockResolvedValue(undefined),
}))

const mockClientWithDocs = {
  id: 'client-1',
  nom: 'Entreprise Alpha',
  nif: '00011223344',
  telephone: '0550123456',
  adresse: '12 Rue de la Liberté, Alger',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  documents: [
    {
      id: 'doc-1',
      title: 'Facture Client Alpha 1',
      documentType: 'FACTURE_VENTE',
      module: 'CLIENTS',
      issueDate: new Date('2026-03-01T00:00:00.000Z'),
      dueDate: new Date('2026-03-31T00:00:00.000Z'),
      amount: '50000.00',
      isPaid: true,
      physicalLocation: 'Armoire A',
      notes: 'Payé par chèque',
      fileKey: 'CLIENTS/client-1/facture.pdf',
      clientId: 'client-1',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    },
  ],
}

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    client: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

function authenticatedRequest(url: string, body?: Record<string, unknown>, method: string = 'GET') {
  mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
  return new Request(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

function unauthenticatedRequest(url: string, body?: Record<string, unknown>, method: string = 'GET') {
  mockSession = null
  return new Request(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

describe('Client [id] API Routes (/api/clients/[id])', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/clients/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await GET(unauthenticatedRequest('/api/clients/client-1'), {
        params: { id: 'client-1' },
      })
      expect(res.status).toBe(401)
    })

    it('returns 404 when client is not found', async () => {
      ;(db.client.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await GET(authenticatedRequest('/api/clients/client-999'), {
        params: { id: 'client-999' },
      })
      expect(res.status).toBe(404)
    })

    it('returns client with documents and signed URLs', async () => {
      ;(db.client.findUnique as jest.Mock).mockResolvedValue(mockClientWithDocs)

      const res = await GET(authenticatedRequest('/api/clients/client-1'), {
        params: { id: 'client-1' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.id).toBe('client-1')
      expect(data.nom).toBe('Entreprise Alpha')
      expect(data.documents).toHaveLength(1)
      expect(data.documents[0].signedUrl).toBe('http://minio/signed/CLIENTS/client-1/facture.pdf')
      expect(data.documents[0].amount).toBe(50000)
    })
  })

  describe('PATCH /api/clients/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await PATCH(
        unauthenticatedRequest('/api/clients/client-1', { nom: 'Updated Nom' }, 'PATCH'),
        { params: { id: 'client-1' } }
      )
      expect(res.status).toBe(401)
    })

    it('returns 404 when client is not found', async () => {
      ;(db.client.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await PATCH(
        authenticatedRequest('/api/clients/client-999', { nom: 'Updated Nom' }, 'PATCH'),
        { params: { id: 'client-999' } }
      )
      expect(res.status).toBe(404)
    })

    it('returns 400 when nom is invalid (empty string)', async () => {
      ;(db.client.findUnique as jest.Mock).mockResolvedValue(mockClientWithDocs)

      const res = await PATCH(
        authenticatedRequest('/api/clients/client-1', { nom: '   ' }, 'PATCH'),
        { params: { id: 'client-1' } }
      )
      expect(res.status).toBe(400)
    })

    it('updates client and returns 200', async () => {
      ;(db.client.findUnique as jest.Mock).mockResolvedValue(mockClientWithDocs)
      const updatedClient = {
        ...mockClientWithDocs,
        nom: 'Alpha Modifié',
        telephone: '0550000000',
      }
      ;(db.client.update as jest.Mock).mockResolvedValue(updatedClient)

      const res = await PATCH(
        authenticatedRequest('/api/clients/client-1', { nom: 'Alpha Modifié', telephone: '0550000000' }, 'PATCH'),
        { params: { id: 'client-1' } }
      )
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.nom).toBe('Alpha Modifié')
      expect(db.client.update).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        data: {
          nom: 'Alpha Modifié',
          telephone: '0550000000',
        },
      })
    })
  })

  describe('DELETE /api/clients/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await DELETE(unauthenticatedRequest('/api/clients/client-1', undefined, 'DELETE'), {
        params: { id: 'client-1' },
      })
      expect(res.status).toBe(401)
    })

    it('returns 404 when client is not found', async () => {
      ;(db.client.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await DELETE(authenticatedRequest('/api/clients/client-999', undefined, 'DELETE'), {
        params: { id: 'client-999' },
      })
      expect(res.status).toBe(404)
    })

    it('deletes client and returns success', async () => {
      ;(db.client.findUnique as jest.Mock).mockResolvedValue(mockClientWithDocs)
      ;(db.client.delete as jest.Mock).mockResolvedValue(mockClientWithDocs)

      const res = await DELETE(authenticatedRequest('/api/clients/client-1', undefined, 'DELETE'), {
        params: { id: 'client-1' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(db.client.delete).toHaveBeenCalledWith({
        where: { id: 'client-1' },
      })
    })
  })
})
