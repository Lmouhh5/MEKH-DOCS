/**
 * @jest-environment node
 */
import { POST as uploadDoc } from './route'
import { PATCH as moveDoc } from './[id]/move/route'
import { DELETE as deleteDoc, GET as getDoc } from './[id]/route'
import db from '@/lib/db'
import { uploadFile, deleteFile, generateKey } from '@/lib/minio'
import { Prisma } from '@prisma/client'

let mockSession: { user: { id: string; email: string; role: string } } | null = null

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => mockSession),
}))

jest.mock('@/lib/minio', () => ({
  uploadFile: jest.fn().mockResolvedValue(undefined),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  getSignedUrl: jest
    .fn()
    .mockImplementation((key: string) => Promise.resolve(`http://minio/signed/${key}`)),
  generateKey: jest.fn(
    (module: string, entityIdOrFilename: string | null | undefined, maybeFilename?: string) => {
      const filename = maybeFilename || entityIdOrFilename || 'document.pdf'
      return `${module}/global/12345-${filename}`
    }
  ),
}))

const mockCluster = {
  id: 'cluster-1',
  name: 'Contrats 2026',
  parentId: null,
  description: 'Dossier contrats',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

const mockTargetCluster = {
  id: 'cluster-2',
  name: 'Archives Mortes',
  parentId: null,
  description: 'Dossier archives mortes',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

const mockArchiveDocument = {
  id: 'doc-arch-1',
  title: 'Convention Partenariat 2026',
  documentType: 'ARCHIVE_DOCUMENT',
  module: 'ARCHIVES',
  issueDate: new Date('2026-02-15T00:00:00.000Z'),
  dueDate: new Date('2026-12-31T00:00:00.000Z'),
  amount: new Prisma.Decimal('150000.00'),
  isPaid: null,
  physicalLocation: 'Rayon B, Boite 4',
  notes: 'Document confidentiel',
  fileKey: 'archives/global/12345-convention.pdf',
  clientId: null,
  fournisseurId: null,
  machineId: null,
  travailleurId: null,
  archiveClusterId: 'cluster-1',
  createdAt: new Date('2026-02-15T10:00:00.000Z'),
  updatedAt: new Date('2026-02-15T10:00:00.000Z'),
}

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    archiveCluster: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.id === 'cluster-1') return mockCluster
        if (where.id === 'cluster-2') return mockTargetCluster
        return null
      }),
    },
    document: {
      create: jest.fn(async ({ data }) => ({
        id: 'doc-arch-created',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findUnique: jest.fn(async ({ where }) => {
        if (where.id === 'doc-arch-1') return mockArchiveDocument
        return null
      }),
      update: jest.fn(async ({ where, data }) => {
        if (where.id === 'doc-arch-1') {
          return {
            ...mockArchiveDocument,
            ...data,
            updatedAt: new Date(),
          }
        }
        return null
      }),
      delete: jest.fn(async ({ where }) => {
        if (where.id === 'doc-arch-1') return mockArchiveDocument
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

  return new Request('http://localhost/api/archive/documents', {
    method: 'POST',
    body: formData,
  })
}

function jsonRequest(url: string, method: string, body?: Record<string, unknown>) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

describe('Archive Documents API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = { user: { id: 'user-1', email: 'admin@erp.local', role: 'ADMIN' } }
  })

  describe('Authentication', () => {
    it('returns 401 on POST /api/archive/documents when unauthenticated', async () => {
      mockSession = null
      const dummyPdf = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' })
      const req = createMultipartRequest({ title: 'Test', issueDate: '2026-01-01', archiveClusterId: 'cluster-1' }, dummyPdf)
      const res = await uploadDoc(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Non autorisé')
    })

    it('returns 401 on PATCH /api/archive/documents/[id]/move when unauthenticated', async () => {
      mockSession = null
      const req = jsonRequest('/api/archive/documents/doc-arch-1/move', 'PATCH', { targetClusterId: 'cluster-2' })
      const res = await moveDoc(req, { params: { id: 'doc-arch-1' } })
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Non autorisé')
    })

    it('returns 401 on DELETE /api/archive/documents/[id] when unauthenticated', async () => {
      mockSession = null
      const req = jsonRequest('/api/archive/documents/doc-arch-1', 'DELETE')
      const res = await deleteDoc(req, { params: { id: 'doc-arch-1' } })
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Non autorisé')
    })

    it('returns 401 on GET /api/archive/documents/[id] when unauthenticated', async () => {
      mockSession = null
      const req = jsonRequest('/api/archive/documents/doc-arch-1', 'GET')
      const res = await getDoc(req, { params: { id: 'doc-arch-1' } })
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Non autorisé')
    })
  })

  describe('POST /api/archive/documents (Upload)', () => {
    it('returns 400 when file is missing', async () => {
      const req = createMultipartRequest({
        title: 'Document sans fichier',
        issueDate: '2026-03-01',
        archiveClusterId: 'cluster-1',
      })
      const res = await uploadDoc(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('fichier')
    })

    it('returns 400 when file is not a PDF', async () => {
      const txtBlob = new Blob(['Texte simple'], { type: 'text/plain' })
      const req = createMultipartRequest(
        {
          title: 'Faux document',
          issueDate: '2026-03-01',
          archiveClusterId: 'cluster-1',
        },
        txtBlob,
        'test.txt'
      )
      const res = await uploadDoc(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('PDF')
    })

    it('returns 400 when file exceeds 50MB', async () => {
      const mockFile = new File(['content'], 'heavy.pdf', { type: 'application/pdf' })
      Object.defineProperty(mockFile, 'size', { value: 52 * 1024 * 1024 })
      const formData = new FormData()
      formData.append('title', 'Document trop lourd')
      formData.append('issueDate', '2026-03-01')
      formData.append('archiveClusterId', 'cluster-1')

      const req = new Request('http://localhost/api/archive/documents', { method: 'POST' })
      jest.spyOn(req, 'formData').mockResolvedValue(formData)
      const originalGet = formData.get.bind(formData)
      jest.spyOn(formData, 'get').mockImplementation((key: string) => {
        if (key === 'file') return mockFile as any
        return originalGet(key)
      })

      const res = await uploadDoc(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('50 Mo')
    })

    it('returns 400 when title is missing or empty', async () => {
      const dummyPdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
      const req = createMultipartRequest(
        {
          title: '   ',
          issueDate: '2026-03-01',
          archiveClusterId: 'cluster-1',
        },
        dummyPdf
      )
      const res = await uploadDoc(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Le titre est requis')
    })

    it('returns 400 when issueDate is invalid', async () => {
      const dummyPdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
      const req = createMultipartRequest(
        {
          title: 'Archive Doc',
          issueDate: 'not-a-valid-date',
          archiveClusterId: 'cluster-1',
        },
        dummyPdf
      )
      const res = await uploadDoc(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('émission')
    })

    it('returns 400 when archiveClusterId is missing', async () => {
      const dummyPdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
      const req = createMultipartRequest(
        {
          title: 'Archive Doc',
          issueDate: '2026-03-01',
        },
        dummyPdf
      )
      const res = await uploadDoc(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('dossier')
    })

    it('returns 404 when archiveClusterId does not exist', async () => {
      const dummyPdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
      const req = createMultipartRequest(
        {
          title: 'Archive Doc',
          issueDate: '2026-03-01',
          archiveClusterId: 'cluster-non-existent',
        },
        dummyPdf
      )
      const res = await uploadDoc(req)
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toContain('non trouvé')
    })

    it('returns 400 when dueDate is invalid', async () => {
      const dummyPdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
      const req = createMultipartRequest(
        {
          title: 'Archive Doc',
          issueDate: '2026-03-01',
          dueDate: 'invalid-due-date',
          archiveClusterId: 'cluster-1',
        },
        dummyPdf
      )
      const res = await uploadDoc(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('échéance')
    })

    it('returns 400 when amount is not a valid number', async () => {
      const dummyPdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
      const req = createMultipartRequest(
        {
          title: 'Archive Doc',
          issueDate: '2026-03-01',
          amount: 'cinq-cents',
          archiveClusterId: 'cluster-1',
        },
        dummyPdf
      )
      const res = await uploadDoc(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Montant')
    })

    it('returns 400 when req.formData fails', async () => {
      const req = new Request('http://localhost/api/archive/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: 'invalid-multipart',
      })
      const res = await uploadDoc(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('multipart')
    })

    it('returns 500 when MinIO upload fails', async () => {
      ;(uploadFile as jest.Mock).mockRejectedValueOnce(new Error('MinIO connection refused'))
      const dummyPdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
      const req = createMultipartRequest(
        {
          title: 'Document MinIO Fail',
          issueDate: '2026-03-01',
          archiveClusterId: 'cluster-1',
        },
        dummyPdf
      )
      const res = await uploadDoc(req)
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toContain('téléversement')
    })

    it('successfully uploads PDF to MinIO and creates Document with archiveClusterId', async () => {
      const dummyPdf = new Blob(['%PDF-1.4 sample content'], { type: 'application/pdf' })
      const req = createMultipartRequest(
        {
          title: 'Bilan Annuel 2025',
          issueDate: '2026-01-15T00:00:00.000Z',
          dueDate: '2026-06-30T00:00:00.000Z',
          amount: '75000.50',
          physicalLocation: 'Armoire Archives C',
          notes: 'Dossier complet',
          archiveClusterId: 'cluster-1',
        },
        dummyPdf,
        'bilan-2025.pdf'
      )

      const res = await uploadDoc(req)
      expect(res.status).toBe(201)
      const json = await res.json()

      expect(uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringMatching(/^archives\//),
        'application/pdf'
      )

      expect(db.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          module: 'ARCHIVES',
          documentType: 'ARCHIVE_DOCUMENT',
          archiveClusterId: 'cluster-1',
          title: 'Bilan Annuel 2025',
          issueDate: expect.any(Date),
          dueDate: expect.any(Date),
          physicalLocation: 'Armoire Archives C',
          notes: 'Dossier complet',
        }),
      })

      expect(json.id).toBe('doc-arch-created')
      expect(json.title).toBe('Bilan Annuel 2025')
      expect(json.archiveClusterId).toBe('cluster-1')
    })
  })

  describe('PATCH /api/archive/documents/[id]/move', () => {
    it('returns 400 when body is invalid JSON or targetClusterId is missing', async () => {
      const req = jsonRequest('/api/archive/documents/doc-arch-1/move', 'PATCH', {})
      const res = await moveDoc(req, { params: { id: 'doc-arch-1' } })
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('cible')
    })

    it('returns 404 when document to move is not found', async () => {
      const req = jsonRequest('/api/archive/documents/unknown-doc/move', 'PATCH', {
        targetClusterId: 'cluster-2',
      })
      const res = await moveDoc(req, { params: { id: 'unknown-doc' } })
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Document non trouvé')
    })

    it('returns 404 when target cluster is not found', async () => {
      const req = jsonRequest('/api/archive/documents/doc-arch-1/move', 'PATCH', {
        targetClusterId: 'cluster-non-existent',
      })
      const res = await moveDoc(req, { params: { id: 'doc-arch-1' } })
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toContain('Dossier cible non trouvé')
    })

    it('moves document to another cluster without changing fileKey', async () => {
      const req = jsonRequest('/api/archive/documents/doc-arch-1/move', 'PATCH', {
        targetClusterId: 'cluster-2',
      })
      const res = await moveDoc(req, { params: Promise.resolve({ id: 'doc-arch-1' }) })
      expect(res.status).toBe(200)
      const updated = await res.json()

      expect(db.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-arch-1' },
        data: { archiveClusterId: 'cluster-2' },
      })
      expect(updated.archiveClusterId).toBe('cluster-2')
      expect(updated.fileKey).toBe(mockArchiveDocument.fileKey)
      expect(deleteFile).not.toHaveBeenCalled()
      expect(uploadFile).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/archive/documents/[id]', () => {
    it('returns 404 when document is not found', async () => {
      const req = jsonRequest('/api/archive/documents/unknown-doc', 'GET')
      const res = await getDoc(req, { params: { id: 'unknown-doc' } })
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Document non trouvé')
    })

    it('returns document with signedUrl when found', async () => {
      const req = jsonRequest('/api/archive/documents/doc-arch-1', 'GET')
      const res = await getDoc(req, { params: { id: 'doc-arch-1' } })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('doc-arch-1')
      expect(data.title).toBe('Convention Partenariat 2026')
      expect(data.signedUrl).toBe('http://minio/signed/archives/global/12345-convention.pdf')
    })
  })

  describe('DELETE /api/archive/documents/[id]', () => {
    it('returns 404 when document is not found', async () => {
      const req = jsonRequest('/api/archive/documents/unknown-doc', 'DELETE')
      const res = await deleteDoc(req, { params: { id: 'unknown-doc' } })
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Document non trouvé')
    })

    it('deletes document and triggers MinIO file removal', async () => {
      const req = jsonRequest('/api/archive/documents/doc-arch-1', 'DELETE')
      const res = await deleteDoc(req, { params: Promise.resolve({ id: 'doc-arch-1' }) })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      expect(deleteFile).toHaveBeenCalledWith('archives/global/12345-convention.pdf')
      expect(db.document.delete).toHaveBeenCalledWith({
        where: { id: 'doc-arch-1' },
      })
    })
  })
})
