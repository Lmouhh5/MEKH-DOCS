/**
 * @jest-environment node
 */
import { GET } from './route'
import db from '@/lib/db'
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

const mockUnpaidDocs = [
  {
    id: 'doc-client-1',
    title: 'Facture Client Alpha',
    documentType: 'FACTURE_VENTE',
    module: 'CLIENTS',
    issueDate: new Date('2026-01-10T00:00:00.000Z'),
    dueDate: new Date('2026-02-10T00:00:00.000Z'),
    amount: '120000.00',
    isPaid: false,
    fileKey: 'CLIENTS/c1/facture-1.pdf',
    clientId: 'c1',
    fournisseurId: null,
    client: { id: 'c1', nom: 'Entreprise Alpha SARL' },
    fournisseur: null,
    createdAt: new Date('2026-01-10T10:00:00.000Z'),
    updatedAt: new Date('2026-01-10T10:00:00.000Z'),
  },
  {
    id: 'doc-fournisseur-1',
    title: 'Facture Fournisseur Beta',
    documentType: 'FACTURE_ACHAT',
    module: 'FOURNISSEURS',
    issueDate: new Date('2026-02-05T00:00:00.000Z'),
    dueDate: new Date('2026-03-05T00:00:00.000Z'),
    amount: '45000.50',
    isPaid: false,
    fileKey: 'FOURNISSEURS/f1/facture-2.pdf',
    clientId: null,
    fournisseurId: 'f1',
    client: null,
    fournisseur: { id: 'f1', nom: 'Fournisseur Beta EURL' },
    createdAt: new Date('2026-02-05T10:00:00.000Z'),
    updatedAt: new Date('2026-02-05T10:00:00.000Z'),
  },
]

describe('GET /api/dashboard/outstanding', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  it('returns 401 without session', async () => {
    const res = await GET(new Request('http://localhost/api/dashboard/outstanding'))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Non autorisé')
  })

  it('queries db with isPaid = false and module in [CLIENTS, FOURNISSEURS] sorted by issueDate asc', async () => {
    ;(db.document.findMany as jest.Mock).mockImplementationOnce(async (args) => {
      expect(args.where).toEqual({
        isPaid: false,
        module: { in: ['CLIENTS', 'FOURNISSEURS'] },
      })
      expect(args.orderBy).toEqual({ issueDate: 'asc' })
      expect(args.include).toEqual({
        client: true,
        fournisseur: true,
      })
      return mockUnpaidDocs
    })

    const res = await GET(authenticatedRequest('/api/dashboard/outstanding'))
    expect(res.status).toBe(200)
    expect(db.document.findMany).toHaveBeenCalledTimes(1)
  })

  it('returns only unpaid documents from CLIENTS and FOURNISSEURS', async () => {
    ;(db.document.findMany as jest.Mock).mockResolvedValueOnce(mockUnpaidDocs)

    const res = await GET(authenticatedRequest('/api/dashboard/outstanding'))
    const data = await res.json()

    expect(data.every((d: { isPaid: boolean }) => d.isPaid === false)).toBe(true)
    expect(data.every((d: { module: string }) => ['CLIENTS', 'FOURNISSEURS'].includes(d.module))).toBe(true)
  })

  it('maps entityName, formattedAmount, numeric amount, and signedUrl without exposing fileKey', async () => {
    ;(db.document.findMany as jest.Mock).mockResolvedValueOnce(mockUnpaidDocs)

    const res = await GET(authenticatedRequest('/api/dashboard/outstanding'))
    const data = await res.json()

    expect(data).toHaveLength(2)

    // First doc: Client
    expect(data[0].id).toBe('doc-client-1')
    expect(data[0].entityName).toBe('Entreprise Alpha SARL')
    expect(data[0].amount).toBe(120000)
    expect(data[0].formattedAmount).toContain('120')
    expect(data[0].formattedAmount).toContain('DZD')
    expect(data[0].signedUrl).toBe('http://minio/signed/CLIENTS/c1/facture-1.pdf')
    expect(data[0].fileKey).toBeUndefined()

    // Second doc: Fournisseur
    expect(data[1].id).toBe('doc-fournisseur-1')
    expect(data[1].entityName).toBe('Fournisseur Beta EURL')
    expect(data[1].amount).toBe(45000.5)
    expect(data[1].formattedAmount).toContain('45')
    expect(data[1].formattedAmount).toContain('DZD')
    expect(data[1].signedUrl).toBe('http://minio/signed/FOURNISSEURS/f1/facture-2.pdf')
    expect(data[1].fileKey).toBeUndefined()

    expect(getSignedUrl).toHaveBeenCalledWith('CLIENTS/c1/facture-1.pdf')
    expect(getSignedUrl).toHaveBeenCalledWith('FOURNISSEURS/f1/facture-2.pdf')
  })

  it('returns empty array when there are no outstanding documents', async () => {
    ;(db.document.findMany as jest.Mock).mockResolvedValueOnce([])

    const res = await GET(authenticatedRequest('/api/dashboard/outstanding'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(0)
  })
})
