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

const mockWorkerWithDocs = {
  id: 'worker-1',
  nom: 'Ahmed Benali',
  numeroIdentification: 'CIN-12345',
  dateDebutContrat: new Date('2024-01-15T00:00:00.000Z'),
  numeroCnas: '84 1234 5678 90',
  createdAt: new Date('2024-01-15T00:00:00.000Z'),
  updatedAt: new Date('2024-01-15T00:00:00.000Z'),
  documents: [
    {
      id: 'doc-paie-1',
      title: 'Fiche de paie Janvier 2026',
      documentType: 'FICHE_DE_PAIE',
      module: 'PERSONNEL',
      issueDate: new Date('2026-01-31T00:00:00.000Z'),
      dueDate: null,
      amount: '65000.00',
      isPaid: true,
      physicalLocation: 'Armoire RH - Tiroir 1',
      notes: 'Paiement virement',
      fileKey: 'PERSONNEL/worker-1/fiche-janvier-2026.pdf',
      travailleurId: 'worker-1',
      createdAt: new Date('2026-01-31T00:00:00.000Z'),
      updatedAt: new Date('2026-01-31T00:00:00.000Z'),
    },
  ],
}

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    travailleur: {
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

describe('Worker [id] API Routes (/api/personnel/[id])', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/personnel/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await GET(unauthenticatedRequest('/api/personnel/worker-1'), {
        params: { id: 'worker-1' },
      })
      expect(res.status).toBe(401)
    })

    it('returns 404 when worker is not found', async () => {
      ;(db.travailleur.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await GET(authenticatedRequest('/api/personnel/worker-999'), {
        params: { id: 'worker-999' },
      })
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Employé non trouvé')
    })

    it('returns worker with documents and signed URLs', async () => {
      ;(db.travailleur.findUnique as jest.Mock).mockResolvedValue(mockWorkerWithDocs)

      const res = await GET(authenticatedRequest('/api/personnel/worker-1'), {
        params: { id: 'worker-1' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.id).toBe('worker-1')
      expect(data.nom).toBe('Ahmed Benali')
      expect(data.documents).toHaveLength(1)
      expect(data.documents[0].signedUrl).toBe('http://minio/signed/PERSONNEL/worker-1/fiche-janvier-2026.pdf')
      expect(data.documents[0].amount).toBe(65000)
    })
  })

  describe('PATCH /api/personnel/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await PATCH(
        unauthenticatedRequest('/api/personnel/worker-1', { nom: 'Nom Modifié' }, 'PATCH'),
        { params: { id: 'worker-1' } }
      )
      expect(res.status).toBe(401)
    })

    it('returns 404 when worker is not found', async () => {
      ;(db.travailleur.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await PATCH(
        authenticatedRequest('/api/personnel/worker-999', { nom: 'Nom Modifié' }, 'PATCH'),
        { params: { id: 'worker-999' } }
      )
      expect(res.status).toBe(404)
    })

    it('returns 400 when nom is invalid (empty whitespace)', async () => {
      ;(db.travailleur.findUnique as jest.Mock).mockResolvedValue(mockWorkerWithDocs)

      const res = await PATCH(
        authenticatedRequest('/api/personnel/worker-1', { nom: '   ' }, 'PATCH'),
        { params: { id: 'worker-1' } }
      )
      expect(res.status).toBe(400)
    })

    it('returns 400 when dateDebutContrat is invalid', async () => {
      ;(db.travailleur.findUnique as jest.Mock).mockResolvedValue(mockWorkerWithDocs)

      const res = await PATCH(
        authenticatedRequest('/api/personnel/worker-1', { dateDebutContrat: 'not-a-date' }, 'PATCH'),
        { params: { id: 'worker-1' } }
      )
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Date de début de contrat invalide')
    })

    it('updates worker and returns 200', async () => {
      ;(db.travailleur.findUnique as jest.Mock).mockResolvedValue(mockWorkerWithDocs)
      const updatedWorker = {
        ...mockWorkerWithDocs,
        nom: 'Ahmed Benali Modifié',
        numeroCnas: '84 9999 8888 77',
      }
      ;(db.travailleur.update as jest.Mock).mockResolvedValue(updatedWorker)

      const res = await PATCH(
        authenticatedRequest(
          '/api/personnel/worker-1',
          { nom: 'Ahmed Benali Modifié', numeroCnas: '84 9999 8888 77' },
          'PATCH'
        ),
        { params: { id: 'worker-1' } }
      )
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.nom).toBe('Ahmed Benali Modifié')
      expect(db.travailleur.update).toHaveBeenCalledWith({
        where: { id: 'worker-1' },
        data: {
          nom: 'Ahmed Benali Modifié',
          numeroCnas: '84 9999 8888 77',
        },
      })
    })

    it('clears optional fields by setting null when empty strings or null are sent', async () => {
      ;(db.travailleur.findUnique as jest.Mock).mockResolvedValue(mockWorkerWithDocs)
      const updatedWorker = {
        ...mockWorkerWithDocs,
        numeroIdentification: null,
        numeroCnas: null,
        dateDebutContrat: null,
      }
      ;(db.travailleur.update as jest.Mock).mockResolvedValue(updatedWorker)

      const res = await PATCH(
        authenticatedRequest(
          '/api/personnel/worker-1',
          { numeroIdentification: '', numeroCnas: null, dateDebutContrat: '' },
          'PATCH'
        ),
        { params: { id: 'worker-1' } }
      )
      expect(res.status).toBe(200)

      expect(db.travailleur.update).toHaveBeenCalledWith({
        where: { id: 'worker-1' },
        data: {
          numeroIdentification: null,
          numeroCnas: null,
          dateDebutContrat: null,
        },
      })
    })
  })

  describe('DELETE /api/personnel/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await DELETE(unauthenticatedRequest('/api/personnel/worker-1', undefined, 'DELETE'), {
        params: { id: 'worker-1' },
      })
      expect(res.status).toBe(401)
    })

    it('returns 404 when worker is not found', async () => {
      ;(db.travailleur.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await DELETE(authenticatedRequest('/api/personnel/worker-999', undefined, 'DELETE'), {
        params: { id: 'worker-999' },
      })
      expect(res.status).toBe(404)
    })

    it('deletes worker and associated minio files and returns success', async () => {
      ;(db.travailleur.findUnique as jest.Mock).mockResolvedValue(mockWorkerWithDocs)
      ;(db.travailleur.delete as jest.Mock).mockResolvedValue(mockWorkerWithDocs)

      const res = await DELETE(authenticatedRequest('/api/personnel/worker-1', undefined, 'DELETE'), {
        params: { id: 'worker-1' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(db.travailleur.delete).toHaveBeenCalledWith({
        where: { id: 'worker-1' },
      })
    })
  })
})
