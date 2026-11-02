/**
 * @jest-environment node
 */
import { GET } from './route'
import db from '@/lib/db'

let mockSession: { user: { id: string; email: string; role: string } } | null = null

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => mockSession),
}))

jest.mock('@/lib/minio', () => ({
  getSignedUrl: jest
    .fn()
    .mockImplementation((key: string) => Promise.resolve(`http://minio/signed/${key}`)),
}))

const mockDocs = [
  {
    id: 'doc-1',
    title: 'Facture Client Alpha',
    documentType: 'FACTURE_VENTE',
    module: 'CLIENTS',
    issueDate: new Date('2026-03-15T00:00:00.000Z'),
    dueDate: new Date('2026-04-15T00:00:00.000Z'),
    amount: '150000.00',
    isPaid: false,
    fileKey: 'CLIENTS/c1/1-facture.pdf',
    clientId: 'c1',
    fournisseurId: null,
    machineId: null,
    travailleurId: null,
    client: { id: 'c1', nom: 'Alpha SARL' },
    fournisseur: null,
    machine: null,
    travailleur: null,
  },
  {
    id: 'doc-2',
    title: 'Déclaration Fiscale G50',
    documentType: 'G50',
    module: 'FISCALITE',
    issueDate: new Date('2026-02-10T00:00:00.000Z'),
    dueDate: null,
    amount: null,
    isPaid: null,
    fileKey: 'FISCALITE/global/2-g50.pdf',
    clientId: null,
    fournisseurId: null,
    machineId: null,
    travailleurId: null,
    client: null,
    fournisseur: null,
    machine: null,
    travailleur: null,
  },
  {
    id: 'doc-3',
    title: 'Assurance Pelleteuse',
    documentType: 'ASSURANCE',
    module: 'MATERIEL',
    issueDate: new Date('2026-01-05T00:00:00.000Z'),
    dueDate: new Date('2027-01-05T00:00:00.000Z'),
    amount: '80000.00',
    isPaid: true,
    fileKey: 'MATERIEL/m1/3-assurance.pdf',
    clientId: null,
    fournisseurId: null,
    machineId: 'm1',
    travailleurId: null,
    client: null,
    fournisseur: null,
    machine: { id: 'm1', machineId: 'ENG-001', marque: 'Caterpillar', matricule: '12345-116-16' },
    travailleur: null,
  },
]

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    document: {
      findMany: jest.fn(),
    },
  },
}))

function authenticatedRequest(url: string) {
  mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
  return new Request(`http://localhost${url}`)
}

describe('GET /api/search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  it('returns 401 without session', async () => {
    const res = await GET(new Request('http://localhost/api/search'))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Non autorisé')
  })

  it('returns empty array (status 200) when no documents match', async () => {
    ;(db.document.findMany as jest.Mock).mockResolvedValueOnce([])

    const res = await GET(authenticatedRequest('/api/search?type=CACOBATPH'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBe(0)
  })

  it('filters by documentType', async () => {
    ;(db.document.findMany as jest.Mock).mockImplementationOnce(async ({ where }) => {
      expect(where.documentType).toBe('G50')
      return [mockDocs[1]]
    })

    const res = await GET(authenticatedRequest('/api/search?type=G50'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBe(1)
    expect(data[0].documentType).toBe('G50')
    expect(data[0].title).toBe('Déclaration Fiscale G50')
  })

  it('filters by module', async () => {
    ;(db.document.findMany as jest.Mock).mockImplementationOnce(async ({ where }) => {
      expect(where.module).toBe('CLIENTS')
      return [mockDocs[0]]
    })

    const res = await GET(authenticatedRequest('/api/search?module=CLIENTS'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBe(1)
    expect(data[0].module).toBe('CLIENTS')
  })

  it('ignores invalid type and module parameters to prevent Prisma errors', async () => {
    ;(db.document.findMany as jest.Mock).mockImplementationOnce(async ({ where }) => {
      expect(where.documentType).toBeUndefined()
      expect(where.module).toBeUndefined()
      return []
    })

    const res = await GET(authenticatedRequest('/api/search?type=INVALID_TYPE&module=INVALID_MODULE'))
    expect(res.status).toBe(200)
  })

  it('filters by entity text across client, fournisseur, machine, travailleur, archiveCluster, and title', async () => {
    ;(db.document.findMany as jest.Mock).mockImplementationOnce(async ({ where }) => {
      expect(where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: { contains: 'alpha', mode: 'insensitive' } }),
          expect.objectContaining({ client: { nom: { contains: 'alpha', mode: 'insensitive' } } }),
          expect.objectContaining({ fournisseur: { nom: { contains: 'alpha', mode: 'insensitive' } } }),
          expect.objectContaining({ machine: { machineId: { contains: 'alpha', mode: 'insensitive' } } }),
          expect.objectContaining({ machine: { marque: { contains: 'alpha', mode: 'insensitive' } } }),
          expect.objectContaining({ machine: { matricule: { contains: 'alpha', mode: 'insensitive' } } }),
          expect.objectContaining({ travailleur: { nom: { contains: 'alpha', mode: 'insensitive' } } }),
          expect.objectContaining({ archiveCluster: { name: { contains: 'alpha', mode: 'insensitive' } } }),
        ])
      )
      return [mockDocs[0]]
    })

    const res = await GET(authenticatedRequest('/api/search?entity=alpha'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBe(1)
    expect(data[0].id).toBe('doc-1')
  })

  it('filters by date range (from and to)', async () => {
    ;(db.document.findMany as jest.Mock).mockImplementationOnce(async ({ where }) => {
      expect(where.issueDate.gte).toBeInstanceOf(Date)
      expect(where.issueDate.lte).toBeInstanceOf(Date)
      return [mockDocs[0]]
    })

    const res = await GET(
      authenticatedRequest('/api/search?from=2026-03-01T00:00:00.000Z&to=2026-03-31T23:59:59.999Z')
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBe(1)
  })

  it('orders by issueDate desc and includes relations', async () => {
    ;(db.document.findMany as jest.Mock).mockImplementationOnce(async (args) => {
      expect(args.orderBy).toEqual({ issueDate: 'desc' })
      expect(args.include).toEqual({
        client: true,
        fournisseur: true,
        machine: true,
        travailleur: true,
        archiveCluster: {
          select: { id: true, name: true },
        },
      })
      return mockDocs
    })

    const res = await GET(authenticatedRequest('/api/search'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBe(3)
  })

  it('filters by ARCHIVES module and includes archiveCluster info with entityName', async () => {
    const mockArchiveDoc = {
      id: 'doc-arch-1',
      title: 'Contrat Archive 2015',
      documentType: 'ARCHIVE_DOCUMENT',
      module: 'ARCHIVES',
      issueDate: new Date('2015-06-01T00:00:00.000Z'),
      dueDate: null,
      amount: null,
      isPaid: null,
      fileKey: 'ARCHIVES/cl-1/contrat.pdf',
      clientId: null,
      fournisseurId: null,
      machineId: null,
      travailleurId: null,
      archiveClusterId: 'cl-1',
      client: null,
      fournisseur: null,
      machine: null,
      travailleur: null,
      archiveCluster: { id: 'cl-1', name: 'Contrats Historiques' },
    }

    ;(db.document.findMany as jest.Mock).mockImplementationOnce(async ({ where, include }) => {
      expect(where.module).toBe('ARCHIVES')
      expect(include.archiveCluster).toEqual({ select: { id: true, name: true } })
      return [mockArchiveDoc]
    })

    const res = await GET(authenticatedRequest('/api/search?module=ARCHIVES'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBe(1)
    expect(data[0].module).toBe('ARCHIVES')
    expect(data[0].entityName).toBe('Contrats Historiques')
    expect(data[0].archiveCluster).toEqual({ id: 'cl-1', name: 'Contrats Historiques' })
  })

  it('returns "Archive" as entityName when module is ARCHIVES but archiveCluster is null', async () => {
    const mockArchiveDoc = {
      id: 'doc-arch-2',
      title: 'Document orphelin',
      documentType: 'ARCHIVE_DOCUMENT',
      module: 'ARCHIVES',
      issueDate: new Date('2015-06-01T00:00:00.000Z'),
      dueDate: null,
      amount: null,
      isPaid: null,
      fileKey: 'ARCHIVES/orphelin.pdf',
      client: null,
      fournisseur: null,
      machine: null,
      travailleur: null,
      archiveCluster: null,
    }

    ;(db.document.findMany as jest.Mock).mockResolvedValueOnce([mockArchiveDoc])

    const res = await GET(authenticatedRequest('/api/search?module=ARCHIVES'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data[0].entityName).toBe('Archive')
  })

  it('maps results to DocumentSummary format with entityName, signedUrl, and numeric amount', async () => {
    ;(db.document.findMany as jest.Mock).mockResolvedValueOnce(mockDocs)

    const res = await GET(authenticatedRequest('/api/search'))
    expect(res.status).toBe(200)
    const data = await res.json()

    // Doc 1: client Alpha SARL
    expect(data[0]).toMatchObject({
      id: 'doc-1',
      title: 'Facture Client Alpha',
      documentType: 'FACTURE_VENTE',
      module: 'CLIENTS',
      amount: 150000,
      isPaid: false,
      entityName: 'Alpha SARL',
      signedUrl: 'http://minio/signed/CLIENTS/c1/1-facture.pdf',
    })

    // Doc 2: no entity
    expect(data[1]).toMatchObject({
      id: 'doc-2',
      title: 'Déclaration Fiscale G50',
      documentType: 'G50',
      module: 'FISCALITE',
      signedUrl: 'http://minio/signed/FISCALITE/global/2-g50.pdf',
    })
    expect(data[1].entityName).toBeUndefined()

    // Doc 3: machine Caterpillar ENG-001
    expect(data[2]).toMatchObject({
      id: 'doc-3',
      title: 'Assurance Pelleteuse',
      documentType: 'ASSURANCE',
      module: 'MATERIEL',
      amount: 80000,
      isPaid: true,
      signedUrl: 'http://minio/signed/MATERIEL/m1/3-assurance.pdf',
    })
    expect(data[2].entityName).toContain('ENG-001')
  })
})
