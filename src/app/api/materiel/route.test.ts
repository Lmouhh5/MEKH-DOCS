/**
 * @jest-environment node
 */
import { GET, POST } from './route'
import { POST as postDocument } from '@/app/api/documents/route'
import db from '@/lib/db'

let mockSession: { user: { id: string; email: string; role: string } } | null = null

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => mockSession),
}))

jest.mock('@/lib/minio', () => ({
  uploadFile: jest.fn().mockResolvedValue(undefined),
  getSignedUrl: jest
    .fn()
    .mockImplementation((key: string) => Promise.resolve(`http://minio/signed/${key}`)),
  generateKey: jest.fn(
    (module: string, entityId: string | null | undefined, filename: string) =>
      `${module}/${entityId ?? 'global'}/12345-${filename}`
  ),
  deleteFile: jest.fn().mockResolvedValue(undefined),
}))

const mockMachines = [
  {
    id: 'm-1',
    machineId: 'ENG-001',
    marque: 'Caterpillar',
    modele: '320D',
    numeroSerie: 'CAT0320D123456',
    matricule: '01234-116-16',
    statut: 'ACTIF',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    _count: { documents: 3 },
  },
  {
    id: 'm-2',
    machineId: 'ENG-002',
    marque: 'Komatsu',
    modele: 'PC200',
    numeroSerie: 'KOMPC20098765',
    matricule: '05678-118-16',
    statut: 'EN_MAINTENANCE',
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    _count: { documents: 1 },
  },
]

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    machine: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    document: {
      create: jest.fn(async ({ data }) => ({
        id: 'doc-created-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
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

function createMultipartDocumentRequest(fields: Record<string, unknown>, fileBlob?: Blob, fileName = 'assurance.pdf') {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value))
    }
  }
  if (fileBlob) {
    formData.append('file', fileBlob, fileName)
  }

  return new Request('http://localhost/api/documents', {
    method: 'POST',
    body: formData,
  })
}

describe('Materiel API Routes (/api/materiel)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  describe('Document upload dueDate enforcement for MATERIEL', () => {
    it('POST /api/documents rejects ASSURANCE without dueDate', async () => {
      mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
      const req = createMultipartDocumentRequest(
        {
          title: 'Police Assurance 2026',
          module: 'MATERIEL',
          machineId: 'm-1',
          documentType: 'ASSURANCE',
          issueDate: '2026-01-01',
          // dueDate intentionally omitted
        },
        new Blob(['dummy pdf'], { type: 'application/pdf' })
      )

      const res = await postDocument(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("La date d'échéance est requise pour ce type de document")
    })

    it('POST /api/documents rejects CONTROLE_TECHNIQUE without dueDate', async () => {
      mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
      const req = createMultipartDocumentRequest(
        {
          title: 'Contrôle Technique Annuel',
          module: 'MATERIEL',
          machineId: 'm-1',
          documentType: 'CONTROLE_TECHNIQUE',
          issueDate: '2026-01-01',
          // dueDate intentionally omitted
        },
        new Blob(['dummy pdf'], { type: 'application/pdf' })
      )

      const res = await postDocument(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("La date d'échéance est requise pour ce type de document")
    })
  })

  describe('GET /api/materiel', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await GET()
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Non autorisé')
    })

    it('returns all machines ordered by machineId asc with document count', async () => {
      ;(db.machine.findMany as jest.Mock).mockResolvedValue(mockMachines)

      mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
      const res = await GET()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toHaveLength(2)
      expect(data[0].machineId).toBe('ENG-001')
      expect(data[0]._count.documents).toBe(3)

      expect(db.machine.findMany).toHaveBeenCalledWith({
        orderBy: { machineId: 'asc' },
        include: {
          _count: {
            select: { documents: true },
          },
        },
      })
    })
  })

  describe('POST /api/materiel', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await POST(unauthenticatedRequest('/api/materiel', { machineId: 'ENG-001' }, 'POST'))
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Non autorisé')
    })

    it('returns 400 when machineId is missing or empty', async () => {
      const res = await POST(authenticatedRequest('/api/materiel', { marque: 'CAT' }))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })

    it('returns 400 when machineId is whitespace only', async () => {
      const res = await POST(authenticatedRequest('/api/materiel', { machineId: '   ' }))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })

    it('returns 409 when machineId already exists', async () => {
      ;(db.machine.findUnique as jest.Mock).mockResolvedValue(mockMachines[0])

      const res = await POST(
        authenticatedRequest('/api/materiel', {
          machineId: 'ENG-001',
          marque: 'Caterpillar',
        })
      )
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.error).toBe('Cet identifiant de machine existe déjà')
    })

    it('creates machine with default statut ACTIF and returns 201', async () => {
      ;(db.machine.findUnique as jest.Mock).mockResolvedValue(null)
      const createdMachine = {
        id: 'm-3',
        machineId: 'ENG-003',
        marque: 'Volvo',
        modele: 'L120H',
        numeroSerie: 'VLV120H001',
        matricule: '09876-119-16',
        statut: 'ACTIF',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(db.machine.create as jest.Mock).mockResolvedValue(createdMachine)

      const res = await POST(
        authenticatedRequest('/api/materiel', {
          machineId: 'ENG-003',
          marque: 'Volvo',
          modele: 'L120H',
          numeroSerie: 'VLV120H001',
          matricule: '09876-119-16',
        })
      )
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.machineId).toBe('ENG-003')
      expect(data.statut).toBe('ACTIF')
      expect(db.machine.create).toHaveBeenCalledWith({
        data: {
          machineId: 'ENG-003',
          marque: 'Volvo',
          modele: 'L120H',
          numeroSerie: 'VLV120H001',
          matricule: '09876-119-16',
          statut: 'ACTIF',
        },
      })
    })

    it('creates machine with explicit statut and returns 201', async () => {
      ;(db.machine.findUnique as jest.Mock).mockResolvedValue(null)
      const createdMachine = {
        id: 'm-4',
        machineId: 'ENG-004',
        marque: 'Liebherr',
        modele: 'R944',
        numeroSerie: null,
        matricule: null,
        statut: 'EN_MAINTENANCE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(db.machine.create as jest.Mock).mockResolvedValue(createdMachine)

      const res = await POST(
        authenticatedRequest('/api/materiel', {
          machineId: 'ENG-004',
          marque: 'Liebherr',
          modele: 'R944',
          statut: 'EN_MAINTENANCE',
        })
      )
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.statut).toBe('EN_MAINTENANCE')
    })
  })
})
