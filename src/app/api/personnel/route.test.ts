/**
 * @jest-environment node
 */
import { GET, POST } from './route'
import db from '@/lib/db'

let mockSession: { user: { id: string; email: string; role: string } } | null = null

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => mockSession),
}))

const mockWorkers = [
  {
    id: 'worker-1',
    nom: 'Ahmed Benali',
    numeroIdentification: 'CIN-12345',
    dateDebutContrat: new Date('2024-01-15T00:00:00.000Z'),
    numeroCnas: '84 1234 5678 90',
    createdAt: new Date('2024-01-15T00:00:00.000Z'),
    updatedAt: new Date('2024-01-15T00:00:00.000Z'),
    _count: { documents: 5 },
  },
  {
    id: 'worker-2',
    nom: 'Karim Ziani',
    numeroIdentification: 'CIN-67890',
    dateDebutContrat: new Date('2025-06-01T00:00:00.000Z'),
    numeroCnas: '88 9876 5432 10',
    createdAt: new Date('2025-06-01T00:00:00.000Z'),
    updatedAt: new Date('2025-06-01T00:00:00.000Z'),
    _count: { documents: 2 },
  },
]

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    travailleur: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

function authenticatedRequest(url: string, body?: Record<string, unknown>, method: string = 'POST') {
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

describe('Personnel API Routes (/api/personnel)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/personnel', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await GET()
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Non autorisé')
    })

    it('returns workers ordered by nom asc with document count', async () => {
      mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
      ;(db.travailleur.findMany as jest.Mock).mockResolvedValue(mockWorkers)

      const res = await GET()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toHaveLength(2)
      expect(data[0].nom).toBe('Ahmed Benali')
      expect(data[0]._count.documents).toBe(5)

      expect(db.travailleur.findMany).toHaveBeenCalledWith({
        orderBy: { nom: 'asc' },
        include: {
          _count: {
            select: { documents: true },
          },
        },
      })
    })
  })

  describe('POST /api/personnel', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await POST(unauthenticatedRequest('/api/personnel', { nom: 'Nouveau Salarié' }, 'POST'))
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Non autorisé')
    })

    it('creates worker and returns 201', async () => {
      const newWorker = {
        id: 'worker-3',
        nom: 'Samir Bouzid',
        numeroIdentification: 'CIN-112233',
        dateDebutContrat: new Date('2026-03-01T00:00:00.000Z'),
        numeroCnas: '90 1122 3344 55',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(db.travailleur.create as jest.Mock).mockResolvedValue(newWorker)

      const res = await POST(
        authenticatedRequest('/api/personnel', {
          nom: 'Samir Bouzid',
          numeroIdentification: 'CIN-112233',
          dateDebutContrat: '2026-03-01',
          numeroCnas: '90 1122 3344 55',
        })
      )
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.nom).toBe('Samir Bouzid')
      expect(db.travailleur.create).toHaveBeenCalledWith({
        data: {
          nom: 'Samir Bouzid',
          numeroIdentification: 'CIN-112233',
          dateDebutContrat: new Date('2026-03-01'),
          numeroCnas: '90 1122 3344 55',
        },
      })
    })

    it('creates worker with nullable fields as null when omitted', async () => {
      const simpleWorker = {
        id: 'worker-4',
        nom: 'Simple Worker',
        numeroIdentification: null,
        dateDebutContrat: null,
        numeroCnas: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(db.travailleur.create as jest.Mock).mockResolvedValue(simpleWorker)

      const res = await POST(
        authenticatedRequest('/api/personnel', {
          nom: 'Simple Worker',
        })
      )
      expect(res.status).toBe(201)
      expect(db.travailleur.create).toHaveBeenCalledWith({
        data: {
          nom: 'Simple Worker',
          numeroIdentification: null,
          dateDebutContrat: null,
          numeroCnas: null,
        },
      })
    })

    it('returns 400 when nom is missing', async () => {
      const res = await POST(authenticatedRequest('/api/personnel', {}))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })

    it('returns 400 when nom is empty string or whitespace', async () => {
      const res = await POST(authenticatedRequest('/api/personnel', { nom: '   ' }))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })

    it('returns 400 when dateDebutContrat is invalid', async () => {
      const res = await POST(
        authenticatedRequest('/api/personnel', {
          nom: 'Test Worker',
          dateDebutContrat: 'invalid-date-string',
        })
      )
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Date de début de contrat invalide')
    })

    it('returns 400 when request body is not valid JSON', async () => {
      mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
      const invalidJsonReq = new Request('http://localhost/api/personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      })
      const res = await POST(invalidJsonReq)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Corps de requête JSON invalide')
    })
  })
})
