/**
 * @jest-environment node
 */
import { GET, PATCH, DELETE } from './route'
import db from '@/lib/db'
import { deleteFile } from '@/lib/minio'

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

const mockClientDoc = {
  id: 'doc-client-1',
  title: 'Facture Client #1',
  documentType: 'FACTURE_VENTE',
  module: 'CLIENTS',
  issueDate: new Date('2026-03-01'),
  dueDate: null,
  amount: '1200.00',
  isPaid: false,
  physicalLocation: 'Classeur A',
  notes: 'Paiement à 30 jours',
  fileKey: 'CLIENTS/client-1/facture.pdf',
  clientId: 'client-1',
  fournisseurId: null,
  machineId: null,
  travailleurId: null,
  client: { id: 'client-1', nom: 'Entreprise ABC' },
  fournisseur: null,
  machine: null,
  travailleur: null,
}

const mockAssuranceDoc = {
  id: 'doc-machine-1',
  title: 'Police Assurance',
  documentType: 'ASSURANCE',
  module: 'MATERIEL',
  issueDate: new Date('2026-01-01'),
  dueDate: new Date('2027-01-01'),
  amount: '50000.00',
  isPaid: true,
  physicalLocation: 'Coffre',
  notes: 'Contrat tous risques',
  fileKey: 'MATERIEL/machine-1/assurance.pdf',
  clientId: null,
  fournisseurId: null,
  machineId: 'machine-1',
  travailleurId: null,
  client: null,
  fournisseur: null,
  machine: { id: 'machine-1', machineId: 'ENG-01' },
  travailleur: null,
}

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    document: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.id === 'doc-client-1') return mockClientDoc
        if (where.id === 'doc-machine-1') return mockAssuranceDoc
        return null
      }),
      update: jest.fn(async ({ where, data }) => {
        const base = where.id === 'doc-client-1' ? mockClientDoc : mockAssuranceDoc
        return {
          ...base,
          ...data,
        }
      }),
      delete: jest.fn(async ({ where }) => {
        if (where.id === 'doc-client-1') return mockClientDoc
        return mockAssuranceDoc
      }),
    },
  },
}))

describe('GET /api/documents/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  it('returns 401 without session', async () => {
    const res = await GET(new Request('http://localhost/api/documents/doc-client-1'), {
      params: { id: 'doc-client-1' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when document not found', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const res = await GET(new Request('http://localhost/api/documents/unknown'), {
      params: { id: 'unknown' },
    })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Document non trouvé')
  })

  it('returns 200 with document data, relations, signedUrl and without fileKey', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const res = await GET(new Request('http://localhost/api/documents/doc-client-1'), {
      params: { id: 'doc-client-1' },
    })
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.id).toBe('doc-client-1')
    expect(json.fileKey).toBeUndefined()
    expect(json.client).toEqual({ id: 'client-1', nom: 'Entreprise ABC' })
    expect(json.signedUrl).toBe('http://minio/signed/CLIENTS/client-1/facture.pdf')
    expect(json.url).toBe('http://minio/signed/CLIENTS/client-1/facture.pdf')
  })
})

describe('PATCH /api/documents/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  it('returns 401 without session', async () => {
    const res = await PATCH(
      new Request('http://localhost/api/documents/doc-client-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'New Title' }),
      }),
      { params: { id: 'doc-client-1' } }
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when trying to clear dueDate for ASSURANCE document', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const res = await PATCH(
      new Request('http://localhost/api/documents/doc-machine-1', {
        method: 'PATCH',
        body: JSON.stringify({ dueDate: null }),
      }),
      { params: { id: 'doc-machine-1' } }
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("La date d'échéance est requise pour ce type de document")
  })

  it('updates allowed fields and returns updated document without fileKey', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const res = await PATCH(
      new Request('http://localhost/api/documents/doc-client-1', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Facture Modifiée',
          notes: 'Nouvelle note',
          physicalLocation: 'Armoire B',
          amount: '1500.50',
          isPaid: true,
          dueDate: '2026-04-15',
        }),
      }),
      { params: { id: 'doc-client-1' } }
    )

    expect(res.status).toBe(200)
    const json = await res.json()

    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-client-1' },
      data: expect.objectContaining({
        title: 'Facture Modifiée',
        notes: 'Nouvelle note',
        physicalLocation: 'Armoire B',
        isPaid: true,
        dueDate: new Date('2026-04-15'),
      }),
      include: expect.any(Object),
    })

    expect(json.fileKey).toBeUndefined()
    expect(json.signedUrl).toBe('http://minio/signed/CLIENTS/client-1/facture.pdf')
  })
})

describe('DELETE /api/documents/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  it('returns 401 without session', async () => {
    const res = await DELETE(new Request('http://localhost/api/documents/doc-client-1', { method: 'DELETE' }), {
      params: { id: 'doc-client-1' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when document not found', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const res = await DELETE(new Request('http://localhost/api/documents/unknown', { method: 'DELETE' }), {
      params: { id: 'unknown' },
    })
    expect(res.status).toBe(404)
  })

  it('deletes file from MinIO and deletes record from database', async () => {
    mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
    const res = await DELETE(new Request('http://localhost/api/documents/doc-client-1', { method: 'DELETE' }), {
      params: { id: 'doc-client-1' },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    expect(deleteFile).toHaveBeenCalledWith('CLIENTS/client-1/facture.pdf')
    expect(db.document.delete).toHaveBeenCalledWith({
      where: { id: 'doc-client-1' },
    })
  })
})
