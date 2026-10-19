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

const mockMachineWithDocs = {
  id: 'm-1',
  machineId: 'ENG-001',
  marque: 'Caterpillar',
  modele: '320D',
  numeroSerie: 'CAT0320D123456',
  matricule: '01234-116-16',
  statut: 'ACTIF',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  documents: [
    {
      id: 'doc-1',
      title: 'Assurance Pelleteuse 2026',
      documentType: 'ASSURANCE',
      module: 'MATERIEL',
      issueDate: new Date('2026-01-01T00:00:00.000Z'),
      dueDate: new Date('2026-12-31T00:00:00.000Z'),
      amount: '120000.00',
      isPaid: true,
      physicalLocation: 'Classeur Engins',
      notes: 'Tous risques',
      fileKey: 'MATERIEL/m-1/assurance.pdf',
      machineId: 'm-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ],
}

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    machine: {
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

describe('Machine [id] API Routes (/api/materiel/[id])', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/materiel/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await GET(unauthenticatedRequest('/api/materiel/m-1'), {
        params: { id: 'm-1' },
      })
      expect(res.status).toBe(401)
    })

    it('returns 404 when machine is not found', async () => {
      ;(db.machine.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await GET(authenticatedRequest('/api/materiel/m-999'), {
        params: { id: 'm-999' },
      })
      expect(res.status).toBe(404)
    })

    it('returns machine with documents and signed URLs', async () => {
      ;(db.machine.findUnique as jest.Mock).mockResolvedValue(mockMachineWithDocs)

      const res = await GET(authenticatedRequest('/api/materiel/m-1'), {
        params: { id: 'm-1' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.id).toBe('m-1')
      expect(data.machineId).toBe('ENG-001')
      expect(data.documents).toHaveLength(1)
      expect(data.documents[0].signedUrl).toBe('http://minio/signed/MATERIEL/m-1/assurance.pdf')
      expect(data.documents[0].amount).toBe(120000)
    })
  })

  describe('PATCH /api/materiel/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await PATCH(
        unauthenticatedRequest('/api/materiel/m-1', { marque: 'CAT Modifiée' }, 'PATCH'),
        { params: { id: 'm-1' } }
      )
      expect(res.status).toBe(401)
    })

    it('returns 404 when machine is not found', async () => {
      ;(db.machine.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await PATCH(
        authenticatedRequest('/api/materiel/m-999', { marque: 'CAT Modifiée' }, 'PATCH'),
        { params: { id: 'm-999' } }
      )
      expect(res.status).toBe(404)
    })

    it('returns 400 when machineId is empty string', async () => {
      ;(db.machine.findUnique as jest.Mock).mockResolvedValue(mockMachineWithDocs)

      const res = await PATCH(
        authenticatedRequest('/api/materiel/m-1', { machineId: '   ' }, 'PATCH'),
        { params: { id: 'm-1' } }
      )
      expect(res.status).toBe(400)
    })

    it('returns 409 when new machineId already exists on another machine', async () => {
      ;(db.machine.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMachineWithDocs) // first lookup by id
        .mockResolvedValueOnce({ id: 'm-2', machineId: 'ENG-EXISTS' }) // second lookup by machineId

      const res = await PATCH(
        authenticatedRequest('/api/materiel/m-1', { machineId: 'ENG-EXISTS' }, 'PATCH'),
        { params: { id: 'm-1' } }
      )
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.error).toBe('Cet identifiant de machine existe déjà')
    })

    it('updates machine and returns 200', async () => {
      ;(db.machine.findUnique as jest.Mock).mockResolvedValue(mockMachineWithDocs)
      const updatedMachine = {
        ...mockMachineWithDocs,
        statut: 'EN_MAINTENANCE',
        modele: '320D L',
      }
      ;(db.machine.update as jest.Mock).mockResolvedValue(updatedMachine)

      const res = await PATCH(
        authenticatedRequest(
          '/api/materiel/m-1',
          { statut: 'EN_MAINTENANCE', modele: '320D L' },
          'PATCH'
        ),
        { params: { id: 'm-1' } }
      )
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.statut).toBe('EN_MAINTENANCE')
      expect(data.modele).toBe('320D L')
      expect(db.machine.update).toHaveBeenCalledWith({
        where: { id: 'm-1' },
        data: {
          statut: 'EN_MAINTENANCE',
          modele: '320D L',
        },
      })
    })

    it('clears optional fields by setting null when empty strings are passed', async () => {
      ;(db.machine.findUnique as jest.Mock).mockResolvedValue(mockMachineWithDocs)
      const updatedMachine = {
        ...mockMachineWithDocs,
        marque: null,
        modele: null,
        numeroSerie: null,
        matricule: null,
      }
      ;(db.machine.update as jest.Mock).mockResolvedValue(updatedMachine)

      const res = await PATCH(
        authenticatedRequest(
          '/api/materiel/m-1',
          { marque: '', modele: '', numeroSerie: '', matricule: '' },
          'PATCH'
        ),
        { params: { id: 'm-1' } }
      )
      expect(res.status).toBe(200)

      expect(db.machine.update).toHaveBeenCalledWith({
        where: { id: 'm-1' },
        data: {
          marque: null,
          modele: null,
          numeroSerie: null,
          matricule: null,
        },
      })
    })
  })

  describe('DELETE /api/materiel/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await DELETE(
        unauthenticatedRequest('/api/materiel/m-1', undefined, 'DELETE'),
        { params: { id: 'm-1' } }
      )
      expect(res.status).toBe(401)
    })

    it('returns 404 when machine is not found', async () => {
      ;(db.machine.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await DELETE(
        authenticatedRequest('/api/materiel/m-999', undefined, 'DELETE'),
        { params: { id: 'm-999' } }
      )
      expect(res.status).toBe(404)
    })

    it('deletes machine and associated MinIO files', async () => {
      ;(db.machine.findUnique as jest.Mock).mockResolvedValue(mockMachineWithDocs)
      ;(db.machine.delete as jest.Mock).mockResolvedValue(mockMachineWithDocs)

      const res = await DELETE(
        authenticatedRequest('/api/materiel/m-1', undefined, 'DELETE'),
        { params: { id: 'm-1' } }
      )
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(db.machine.delete).toHaveBeenCalledWith({
        where: { id: 'm-1' },
      })
    })
  })
})
