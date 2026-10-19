/**
 * @jest-environment node
 */
import { POST, GET } from './route'
import db from '@/lib/db'
import { uploadFile, getSignedUrl } from '@/lib/minio'

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

const mockDocumentRecord = {
  id: 'doc-1',
  title: 'Facture Client A',
  documentType: 'FACTURE_VENTE',
  module: 'CLIENTS',
  issueDate: new Date('2026-03-01T00:00:00.000Z'),
  dueDate: null,
  amount: '500.00',
  isPaid: false,
  physicalLocation: 'Armoire 2',
  notes: 'Remise 5%',
  fileKey: 'CLIENTS/client-1/12345-facture.pdf',
  clientId: 'client-1',
  fournisseurId: null,
  machineId: null,
  travailleurId: null,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
}

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    document: {
      create: jest.fn(async ({ data }) => ({
        id: 'doc-created-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findMany: jest.fn(async () => [mockDocumentRecord]),
      findUnique: jest.fn(async ({ where }) => {
        if (where.id === 'doc-1') return mockDocumentRecord
        return null
      }),
    },
  },
}))

function createMultipartRequest(fields: Record<string, unknown>, fileBlob?: Blob, fileName = 'sample.pdf') {
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

describe('POST /api/documents', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  it('returns 401 without session', async () => {
    const req = new Request('http://localhost/api/documents', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Non autorisé')
  })

  it('returns 400 when file is missing', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const req = createMultipartRequest({
      title: 'Facture test',
      module: 'CLIENTS',
      documentType: 'FACTURE_VENTE',
      issueDate: '2026-03-01',
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Le fichier est requis')
  })

  it('returns 400 when title is missing', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const req = createMultipartRequest(
      {
        module: 'CLIENTS',
        documentType: 'FACTURE_VENTE',
        issueDate: '2026-03-01',
      },
      new Blob(['dummy content'], { type: 'application/pdf' })
    )

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Le titre est requis')
  })

  it('returns 400 when module is invalid', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const req = createMultipartRequest(
      {
        title: 'Document',
        module: 'INVALID_MODULE',
        documentType: 'FACTURE_VENTE',
        issueDate: '2026-03-01',
      },
      new Blob(['dummy content'], { type: 'application/pdf' })
    )

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Module invalide')
  })

  it('returns 400 when documentType is not allowed for the module', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const req = createMultipartRequest(
      {
        title: 'G50 Déclaration',
        module: 'CLIENTS', // G50 is fiscalite, not clients
        documentType: 'G50',
        issueDate: '2026-03-01',
      },
      new Blob(['dummy content'], { type: 'application/pdf' })
    )

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Type de document non valide pour ce module')
  })

  it('returns 400 when documentType is ASSURANCE and dueDate is missing', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const req = createMultipartRequest(
      {
        title: 'Assurance Camion',
        module: 'MATERIEL',
        documentType: 'ASSURANCE',
        issueDate: '2026-03-01',
        // dueDate omitted!
      },
      new Blob(['dummy content'], { type: 'application/pdf' })
    )

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("La date d'échéance est requise pour ce type de document")
  })

  it('returns 400 when documentType is CONTROLE_TECHNIQUE and dueDate is missing', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const req = createMultipartRequest(
      {
        title: 'Contrôle Technique Pelleteuse',
        module: 'MATERIEL',
        documentType: 'CONTROLE_TECHNIQUE',
        issueDate: '2026-03-01',
        dueDate: '', // empty string
      },
      new Blob(['dummy content'], { type: 'application/pdf' })
    )

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("La date d'échéance est requise pour ce type de document")
  })

  it('successfully creates document, uploads to MinIO, and returns 201 with signedUrl and without fileKey', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const fileContent = 'pdf-bytes'
    const req = createMultipartRequest(
      {
        title: 'Assurance Annuelle',
        module: 'MATERIEL',
        documentType: 'ASSURANCE',
        issueDate: '2026-01-01',
        dueDate: '2027-01-01',
        amount: '125000',
        entityId: 'machine-42',
      },
      new Blob([fileContent], { type: 'application/pdf' }),
      'assurance-2026.pdf'
    )

    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()

    expect(uploadFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining('MATERIEL/machine-42/'),
      'application/pdf'
    )
    expect(db.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Assurance Annuelle',
        documentType: 'ASSURANCE',
        module: 'MATERIEL',
        machineId: 'machine-42',
        dueDate: new Date('2027-01-01'),
      }),
    })

    // fileKey must be omitted from response
    expect(json.fileKey).toBeUndefined()
    // signedUrl and url must be included
    expect(json.signedUrl).toContain('http://minio/signed/')
    expect(json.url).toContain('http://minio/signed/')
  })
})

describe('GET /api/documents', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  it('returns 401 without session', async () => {
    const res = await GET(new Request('http://localhost/api/documents'))
    expect(res.status).toBe(401)
  })

  it('returns 200 with list of documents including signedUrls and omitting fileKey', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const res = await GET(new Request('http://localhost/api/documents?module=CLIENTS'))
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(Array.isArray(json)).toBe(true)
    expect(json.length).toBe(1)
    expect(json[0].fileKey).toBeUndefined()
    expect(json[0].signedUrl).toBe('http://minio/signed/CLIENTS/client-1/12345-facture.pdf')
    expect(getSignedUrl).toHaveBeenCalledWith(mockDocumentRecord.fileKey)
  })
})
