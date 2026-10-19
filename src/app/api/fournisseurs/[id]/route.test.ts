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

const mockSupplierWithDocs = {
  id: 'fournisseur-1',
  nom: 'Fournisseur Alpha',
  nif: '00011223344',
  telephone: '0550123456',
  adresse: '12 Rue de la Liberté, Alger',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  documents: [
    {
      id: 'doc-1',
      title: 'Facture Fournisseur Alpha 1',
      documentType: 'FACTURE_ACHAT',
      module: 'FOURNISSEURS',
      issueDate: new Date('2026-03-01T00:00:00.000Z'),
      dueDate: new Date('2026-03-31T00:00:00.000Z'),
      amount: '75000.00',
      isPaid: false,
      physicalLocation: 'Armoire F',
      notes: 'Paiement à 30 jours',
      fileKey: 'FOURNISSEURS/fournisseur-1/facture.pdf',
      fournisseurId: 'fournisseur-1',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    },
  ],
}

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    fournisseur: {
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

describe('Fournisseur [id] API Routes (/api/fournisseurs/[id])', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/fournisseurs/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await GET(unauthenticatedRequest('/api/fournisseurs/fournisseur-1'), {
        params: { id: 'fournisseur-1' },
      })
      expect(res.status).toBe(401)
    })

    it('returns 404 when supplier is not found', async () => {
      ;(db.fournisseur.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await GET(authenticatedRequest('/api/fournisseurs/fournisseur-999'), {
        params: { id: 'fournisseur-999' },
      })
      expect(res.status).toBe(404)
    })

    it('returns supplier with documents and signed URLs', async () => {
      ;(db.fournisseur.findUnique as jest.Mock).mockResolvedValue(mockSupplierWithDocs)

      const res = await GET(authenticatedRequest('/api/fournisseurs/fournisseur-1'), {
        params: { id: 'fournisseur-1' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.id).toBe('fournisseur-1')
      expect(data.nom).toBe('Fournisseur Alpha')
      expect(data.documents).toHaveLength(1)
      expect(data.documents[0].signedUrl).toBe('http://minio/signed/FOURNISSEURS/fournisseur-1/facture.pdf')
      expect(data.documents[0].amount).toBe(75000)
      expect(data.documents[0].isPaid).toBe(false)
    })
  })

  describe('PATCH /api/fournisseurs/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await PATCH(
        unauthenticatedRequest('/api/fournisseurs/fournisseur-1', { nom: 'Updated Nom' }, 'PATCH'),
        { params: { id: 'fournisseur-1' } }
      )
      expect(res.status).toBe(401)
    })

    it('returns 404 when supplier is not found', async () => {
      ;(db.fournisseur.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await PATCH(
        authenticatedRequest('/api/fournisseurs/fournisseur-999', { nom: 'Updated Nom' }, 'PATCH'),
        { params: { id: 'fournisseur-999' } }
      )
      expect(res.status).toBe(404)
    })

    it('returns 400 when nom is invalid (empty string)', async () => {
      ;(db.fournisseur.findUnique as jest.Mock).mockResolvedValue(mockSupplierWithDocs)

      const res = await PATCH(
        authenticatedRequest('/api/fournisseurs/fournisseur-1', { nom: '   ' }, 'PATCH'),
        { params: { id: 'fournisseur-1' } }
      )
      expect(res.status).toBe(400)
    })

    it('updates supplier and returns 200', async () => {
      ;(db.fournisseur.findUnique as jest.Mock).mockResolvedValue(mockSupplierWithDocs)
      const updatedSupplier = {
        ...mockSupplierWithDocs,
        nom: 'Alpha Fournisseur Modifié',
        telephone: '0550000000',
      }
      ;(db.fournisseur.update as jest.Mock).mockResolvedValue(updatedSupplier)

      const res = await PATCH(
        authenticatedRequest('/api/fournisseurs/fournisseur-1', { nom: 'Alpha Fournisseur Modifié', telephone: '0550000000' }, 'PATCH'),
        { params: { id: 'fournisseur-1' } }
      )
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.nom).toBe('Alpha Fournisseur Modifié')
      expect(db.fournisseur.update).toHaveBeenCalledWith({
        where: { id: 'fournisseur-1' },
        data: {
          nom: 'Alpha Fournisseur Modifié',
          telephone: '0550000000',
        },
      })
    })

    it('clears fields by setting null when empty strings or null are sent', async () => {
      ;(db.fournisseur.findUnique as jest.Mock).mockResolvedValue(mockSupplierWithDocs)
      const updatedSupplier = {
        ...mockSupplierWithDocs,
        nif: null,
        telephone: null,
        adresse: null,
      }
      ;(db.fournisseur.update as jest.Mock).mockResolvedValue(updatedSupplier)

      const res = await PATCH(
        authenticatedRequest('/api/fournisseurs/fournisseur-1', { nif: '', telephone: null, adresse: '' }, 'PATCH'),
        { params: { id: 'fournisseur-1' } }
      )
      expect(res.status).toBe(200)

      expect(db.fournisseur.update).toHaveBeenCalledWith({
        where: { id: 'fournisseur-1' },
        data: {
          nif: null,
          telephone: null,
          adresse: null,
        },
      })
    })
  })

  describe('DELETE /api/fournisseurs/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await DELETE(unauthenticatedRequest('/api/fournisseurs/fournisseur-1', undefined, 'DELETE'), {
        params: { id: 'fournisseur-1' },
      })
      expect(res.status).toBe(401)
    })

    it('returns 404 when supplier is not found', async () => {
      ;(db.fournisseur.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await DELETE(authenticatedRequest('/api/fournisseurs/fournisseur-999', undefined, 'DELETE'), {
        params: { id: 'fournisseur-999' },
      })
      expect(res.status).toBe(404)
    })

    it('deletes supplier and associated minio files and returns success', async () => {
      ;(db.fournisseur.findUnique as jest.Mock).mockResolvedValue(mockSupplierWithDocs)
      ;(db.fournisseur.delete as jest.Mock).mockResolvedValue(mockSupplierWithDocs)

      const res = await DELETE(authenticatedRequest('/api/fournisseurs/fournisseur-1', undefined, 'DELETE'), {
        params: { id: 'fournisseur-1' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(db.fournisseur.delete).toHaveBeenCalledWith({
        where: { id: 'fournisseur-1' },
      })
    })
  })
})
