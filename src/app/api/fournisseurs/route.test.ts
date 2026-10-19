/**
 * @jest-environment node
 */
import { GET, POST } from './route'
import db from '@/lib/db'

let mockSession: { user: { id: string; email: string; role: string } } | null = null

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => mockSession),
}))

const mockSuppliers = [
  {
    id: 'fournisseur-1',
    nom: 'Fournisseur Alpha',
    nif: '00011223344',
    telephone: '0550123456',
    adresse: '12 Rue de la Liberté, Alger',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    _count: { documents: 3 },
  },
  {
    id: 'fournisseur-2',
    nom: 'Société Beta Fournitures',
    nif: '00099887766',
    telephone: '0550987654',
    adresse: '45 Boulevard des Martyrs, Oran',
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    _count: { documents: 0 },
  },
]

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    fournisseur: {
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

describe('Fournisseurs API Routes (/api/fournisseurs)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/fournisseurs', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await GET(unauthenticatedRequest('/api/fournisseurs'))
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Non autorisé')
    })

    it('returns suppliers ordered by nom asc with document count', async () => {
      ;(db.fournisseur.findMany as jest.Mock).mockResolvedValue(mockSuppliers)

      const res = await GET(authenticatedRequest('/api/fournisseurs', undefined, 'GET'))
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toHaveLength(2)
      expect(data[0].nom).toBe('Fournisseur Alpha')
      expect(data[0]._count.documents).toBe(3)

      expect(db.fournisseur.findMany).toHaveBeenCalledWith({
        orderBy: { nom: 'asc' },
        include: {
          _count: {
            select: { documents: true },
          },
        },
      })
    })
  })

  describe('POST /api/fournisseurs', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await POST(unauthenticatedRequest('/api/fournisseurs', { nom: 'Fournisseur Test' }, 'POST'))
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Non autorisé')
    })

    it('creates supplier and returns 201', async () => {
      const newSupplier = {
        id: 'fournisseur-3',
        nom: 'Fournisseur Test',
        nif: '123456789',
        telephone: '0555001122',
        adresse: 'Constantine',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(db.fournisseur.create as jest.Mock).mockResolvedValue(newSupplier)

      const res = await POST(
        authenticatedRequest('/api/fournisseurs', {
          nom: 'Fournisseur Test',
          nif: '123456789',
          telephone: '0555001122',
          adresse: 'Constantine',
        })
      )
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.nom).toBe('Fournisseur Test')
      expect(db.fournisseur.create).toHaveBeenCalledWith({
        data: {
          nom: 'Fournisseur Test',
          nif: '123456789',
          telephone: '0555001122',
          adresse: 'Constantine',
        },
      })
    })

    it('returns 400 when nom is missing', async () => {
      const res = await POST(authenticatedRequest('/api/fournisseurs', {}))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })

    it('returns 400 when nom is empty string or only whitespace', async () => {
      const res = await POST(authenticatedRequest('/api/fournisseurs', { nom: '   ' }))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })
  })
})
