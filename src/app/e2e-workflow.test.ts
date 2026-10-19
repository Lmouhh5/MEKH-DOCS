/**
 * @jest-environment node
 */

import { GET as getClients, POST as createClient } from '@/app/api/clients/route'
import { GET as getClientById } from '@/app/api/clients/[id]/route'
import { GET as getSuppliers, POST as createSupplier } from '@/app/api/fournisseurs/route'
import { GET as getSupplierById } from '@/app/api/fournisseurs/[id]/route'
import { GET as getMachines, POST as createMachine } from '@/app/api/materiel/route'
import { GET as getMachineById } from '@/app/api/materiel/[id]/route'
import { POST as uploadDocument } from '@/app/api/documents/route'
import { GET as getDocumentById } from '@/app/api/documents/[id]/route'
import { GET as getDocumentLinks, POST as createDocumentLink } from '@/app/api/documents/[id]/links/route'
import { GET as getDocumentSignedUrl } from '@/app/api/documents/[id]/signed-url/route'
import { GET as getOutstanding } from '@/app/api/dashboard/outstanding/route'
import { GET as getDeadlines } from '@/app/api/dashboard/deadlines/route'
import { GET as searchDocuments } from '@/app/api/search/route'

// ---------------------------------------------------------
// Global Auth Mock
// ---------------------------------------------------------
let mockSession: { user: { id: string; email: string; role: string } } | null = null

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => mockSession),
}))

// ---------------------------------------------------------
// MinIO Storage Mock
// ---------------------------------------------------------
jest.mock('@/lib/minio', () => ({
  uploadFile: jest.fn().mockResolvedValue(undefined),
  getSignedUrl: jest.fn().mockImplementation((key: string) => Promise.resolve(`http://minio/signed/${key}`)),
  generateKey: jest.fn(
    (module: string, entityId: string | null | undefined, filename: string) =>
      `${module}/${entityId ?? 'global'}/12345-${filename}`
  ),
  deleteFile: jest.fn().mockResolvedValue(undefined),
}))

// ---------------------------------------------------------
// In-Memory Database Store Mock
// ---------------------------------------------------------
interface StoreClient {
  id: string
  nom: string
  nif?: string | null
  telephone?: string | null
  adresse?: string | null
  createdAt: Date
  updatedAt: Date
}

interface StoreSupplier {
  id: string
  nom: string
  nif?: string | null
  telephone?: string | null
  adresse?: string | null
  createdAt: Date
  updatedAt: Date
}

interface StoreMachine {
  id: string
  machineId: string
  marque?: string | null
  modele?: string | null
  numeroSerie?: string | null
  matricule?: string | null
  statut: string
  createdAt: Date
  updatedAt: Date
}

interface StoreDocument {
  id: string
  title: string
  documentType: string
  module: string
  issueDate: Date
  dueDate?: Date | null
  amount?: string | number | null
  isPaid?: boolean | null
  notes?: string | null
  physicalLocation?: string | null
  fileKey: string
  clientId?: string | null
  fournisseurId?: string | null
  machineId?: string | null
  travailleurId?: string | null
  createdAt: Date
  updatedAt: Date
}

interface StoreDocumentWithRelations extends StoreDocument {
  client?: StoreClient | null
  fournisseur?: StoreSupplier | null
  machine?: StoreMachine | null
  travailleur?: null
}

interface StoreDocumentLink {
  id: string
  documentAId: string
  documentBId: string
  createdAt: Date
}

interface StoreManualDeadline {
  id: string
  label: string
  dueDate: Date
  yellowDaysBefore: number
  redDaysBefore: number
}

interface DocSearchOrFilter {
  isPaid?: boolean | null
  title?: { contains?: string; mode?: string }
  client?: { nom?: { contains?: string; mode?: string } }
  fournisseur?: { nom?: { contains?: string; mode?: string } }
  machine?: {
    machineId?: { contains?: string; mode?: string }
    marque?: { contains?: string; mode?: string }
    matricule?: { contains?: string; mode?: string }
  }
  travailleur?: { nom?: { contains?: string; mode?: string } }
}

interface DocFindManyParams {
  where?: {
    dueDate?: { not?: null } | null
    isPaid?: boolean
    module?: string | { in: string[] }
    documentType?: string
    id?: { in: string[] }
    issueDate?: { gte?: Date; lte?: Date }
    OR?: DocSearchOrFilter[]
  }
  include?: {
    client?: boolean
    fournisseur?: boolean
    machine?: boolean
    travailleur?: boolean
  }
  orderBy?: Record<string, string>
}

const clientsStore: StoreClient[] = []
const suppliersStore: StoreSupplier[] = []
const machinesStore: StoreMachine[] = []
const documentsStore: StoreDocument[] = []
const documentLinksStore: StoreDocumentLink[] = []
const manualDeadlinesStore: StoreManualDeadline[] = []
let idCounter = 1

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    client: {
      findMany: jest.fn(async () => {
        return clientsStore.map((c) => ({
          ...c,
          _count: {
            documents: documentsStore.filter((d) => d.clientId === c.id).length,
          },
        }))
      }),
      findUnique: jest.fn(async ({ where, include }: { where: { id: string }; include?: { documents?: boolean } }) => {
        const client = clientsStore.find((c) => c.id === where.id)
        if (!client) return null
        if (include?.documents) {
          const docs = documentsStore
            .filter((d) => d.clientId === client.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          return { ...client, documents: docs }
        }
        return client
      }),
      create: jest.fn(async ({ data }: { data: Omit<StoreClient, 'id' | 'createdAt' | 'updatedAt'> }) => {
        const newClient: StoreClient = {
          id: `client-${idCounter++}`,
          nom: data.nom,
          nif: data.nif || null,
          telephone: data.telephone || null,
          adresse: data.adresse || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        clientsStore.push(newClient)
        return newClient
      }),
    },
    fournisseur: {
      findMany: jest.fn(async () => {
        return suppliersStore.map((s) => ({
          ...s,
          _count: {
            documents: documentsStore.filter((d) => d.fournisseurId === s.id).length,
          },
        }))
      }),
      findUnique: jest.fn(async ({ where, include }: { where: { id: string }; include?: { documents?: boolean } }) => {
        const supplier = suppliersStore.find((s) => s.id === where.id)
        if (!supplier) return null
        if (include?.documents) {
          const docs = documentsStore
            .filter((d) => d.fournisseurId === supplier.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          return { ...supplier, documents: docs }
        }
        return supplier
      }),
      create: jest.fn(async ({ data }: { data: Omit<StoreSupplier, 'id' | 'createdAt' | 'updatedAt'> }) => {
        const newSupplier: StoreSupplier = {
          id: `fournisseur-${idCounter++}`,
          nom: data.nom,
          nif: data.nif || null,
          telephone: data.telephone || null,
          adresse: data.adresse || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        suppliersStore.push(newSupplier)
        return newSupplier
      }),
    },
    machine: {
      findMany: jest.fn(async () => {
        return machinesStore.map((m) => ({
          ...m,
          _count: {
            documents: documentsStore.filter((d) => d.machineId === m.id).length,
          },
        }))
      }),
      findUnique: jest.fn(
        async ({
          where,
          include,
        }: {
          where: { id?: string; machineId?: string }
          include?: { documents?: boolean }
        }) => {
          const machine = machinesStore.find(
            (m) => m.id === where.id || (where.machineId && m.machineId === where.machineId)
          )
          if (!machine) return null
          if (include?.documents) {
            const docs = documentsStore
              .filter((d) => d.machineId === machine.id)
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            return { ...machine, documents: docs }
          }
          return machine
        }
      ),
      create: jest.fn(async ({ data }: { data: Omit<StoreMachine, 'id' | 'createdAt' | 'updatedAt'> }) => {
        const newMachine: StoreMachine = {
          id: `machine-${idCounter++}`,
          machineId: data.machineId,
          marque: data.marque || null,
          modele: data.modele || null,
          numeroSerie: data.numeroSerie || null,
          matricule: data.matricule || null,
          statut: data.statut || 'ACTIF',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        machinesStore.push(newMachine)
        return newMachine
      }),
    },
    document: {
      findMany: jest.fn(async (params?: DocFindManyParams) => {
        const where = params?.where || {}
        let results = [...documentsStore]

        if (where.dueDate?.not === null) {
          results = results.filter((d) => d.dueDate != null)
        }

        if (where.isPaid !== undefined) {
          results = results.filter((d) => d.isPaid === where.isPaid)
        }

        if (where.module) {
          if (typeof where.module === 'string') {
            results = results.filter((d) => d.module === where.module)
          } else if (where.module.in) {
            results = results.filter((d) => (where.module as { in: string[] }).in.includes(d.module))
          }
        }

        if (where.documentType) {
          results = results.filter((d) => d.documentType === where.documentType)
        }

        if (where.id?.in) {
          results = results.filter((d) => where.id!.in!.includes(d.id))
        }

        if (where.issueDate) {
          if (where.issueDate.gte) {
            results = results.filter((d) => new Date(d.issueDate) >= where.issueDate!.gte!)
          }
          if (where.issueDate.lte) {
            results = results.filter((d) => new Date(d.issueDate) <= where.issueDate!.lte!)
          }
        }

        if (where.OR) {
          const isDeadlinesPaidFilter =
            Array.isArray(where.OR) &&
            where.OR.some((c) => c.isPaid === false) &&
            where.OR.some((c) => c.isPaid === null)

          if (isDeadlinesPaidFilter) {
            results = results.filter((d) => d.isPaid === false || d.isPaid === null || d.isPaid === undefined)
          } else {
            results = results.filter((d) => {
              const client = clientsStore.find((c) => c.id === d.clientId)
              const supplier = suppliersStore.find((s) => s.id === d.fournisseurId)
              const machine = machinesStore.find((m) => m.id === d.machineId)

              return where.OR!.some((cond) => {
                if (cond.title?.contains) {
                  return d.title.toLowerCase().includes(cond.title.contains.toLowerCase())
                }
                if (cond.client?.nom?.contains && client) {
                  return client.nom.toLowerCase().includes(cond.client.nom.contains.toLowerCase())
                }
                if (cond.fournisseur?.nom?.contains && supplier) {
                  return supplier.nom.toLowerCase().includes(cond.fournisseur.nom.contains.toLowerCase())
                }
                if (cond.machine?.machineId?.contains && machine) {
                  return machine.machineId.toLowerCase().includes(cond.machine.machineId.contains.toLowerCase())
                }
                if (cond.machine?.marque?.contains && machine?.marque) {
                  return machine.marque.toLowerCase().includes(cond.machine.marque.contains.toLowerCase())
                }
                if (cond.machine?.matricule?.contains && machine?.matricule) {
                  return machine.matricule.toLowerCase().includes(cond.machine.matricule.contains.toLowerCase())
                }
                return false
              })
            })
          }
        }

        return results.map((d): StoreDocumentWithRelations => {
          const res: StoreDocumentWithRelations = { ...d }
          if (params?.include?.client) {
            res.client = clientsStore.find((c) => c.id === d.clientId) || null
          }
          if (params?.include?.fournisseur) {
            res.fournisseur = suppliersStore.find((s) => s.id === d.fournisseurId) || null
          }
          if (params?.include?.machine) {
            res.machine = machinesStore.find((m) => m.id === d.machineId) || null
          }
          if (params?.include?.travailleur) {
            res.travailleur = null
          }
          return res
        })
      }),
      findUnique: jest.fn(
        async ({
          where,
          include,
        }: {
          where: { id: string }
          include?: { client?: boolean; fournisseur?: boolean; machine?: boolean; travailleur?: boolean }
        }) => {
          const doc = documentsStore.find((d) => d.id === where.id)
          if (!doc) return null
          const res: StoreDocumentWithRelations = { ...doc }
          if (include?.client) {
            res.client = clientsStore.find((c) => c.id === doc.clientId) || null
          }
          if (include?.fournisseur) {
            res.fournisseur = suppliersStore.find((s) => s.id === doc.fournisseurId) || null
          }
          if (include?.machine) {
            res.machine = machinesStore.find((m) => m.id === doc.machineId) || null
          }
          if (include?.travailleur) {
            res.travailleur = null
          }
          return res
        }
      ),
      create: jest.fn(
        async ({
          data,
        }: {
          data: Omit<StoreDocument, 'id' | 'createdAt' | 'updatedAt'> & { issueDate: string; dueDate?: string | null }
        }) => {
          const newDoc: StoreDocument = {
            id: `doc-${idCounter++}`,
            title: data.title,
            documentType: data.documentType,
            module: data.module,
            issueDate: new Date(data.issueDate),
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            amount: data.amount != null ? Number(data.amount) : null,
            isPaid: data.isPaid ?? null,
            notes: data.notes || null,
            physicalLocation: data.physicalLocation || null,
            fileKey: data.fileKey,
            clientId: data.clientId || null,
            fournisseurId: data.fournisseurId || null,
            machineId: data.machineId || null,
            travailleurId: data.travailleurId || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          documentsStore.push(newDoc)
          return newDoc
        }
      ),
    },
    documentLink: {
      findMany: jest.fn(async ({ where }: { where?: { OR?: Array<{ documentAId?: string; documentBId?: string }> } }) => {
        if (where?.OR) {
          const docA = where.OR[0]?.documentAId
          const docB = where.OR[1]?.documentBId
          return documentLinksStore.filter((l) => l.documentAId === docA || l.documentBId === docB)
        }
        return documentLinksStore
      }),
      findFirst: jest.fn(async ({ where }: { where?: { OR?: Array<{ documentAId: string; documentBId: string }> } }) => {
        if (where?.OR) {
          const [c1, c2] = where.OR
          return (
            documentLinksStore.find(
              (l) =>
                (l.documentAId === c1.documentAId && l.documentBId === c1.documentBId) ||
                (l.documentAId === c2.documentAId && l.documentBId === c2.documentBId)
            ) || null
          )
        }
        return null
      }),
      create: jest.fn(async ({ data }: { data: { documentAId: string; documentBId: string } }) => {
        const newLink: StoreDocumentLink = {
          id: `link-${idCounter++}`,
          documentAId: data.documentAId,
          documentBId: data.documentBId,
          createdAt: new Date(),
        }
        documentLinksStore.push(newLink)
        return newLink
      }),
    },
    manualDeadline: {
      findMany: jest.fn(async () => manualDeadlinesStore),
    },
  },
}))

// ---------------------------------------------------------
// Helper Request Builders
// ---------------------------------------------------------
function jsonRequest(url: string, body?: unknown, method: string = 'POST') {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

function multipartDocumentRequest(fields: Record<string, unknown>, fileContent = 'sample content') {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value))
    }
  }
  formData.append('file', new Blob([fileContent], { type: 'application/pdf' }), 'document.pdf')

  return new Request('http://localhost/api/documents', {
    method: 'POST',
    body: formData,
  })
}

// Response Interfaces
interface ApiResponseDoc {
  id: string
  title: string
  documentType: string
  module?: string
  amount?: number
  dueDate?: string | null
  isPaid?: boolean
  entityName?: string
  signedUrl?: string
  formattedAmount?: string
}

interface ApiResponseClient {
  id: string
  nom: string
  documents?: ApiResponseDoc[]
}

interface ApiResponseSupplier {
  id: string
  nom: string
  documents?: ApiResponseDoc[]
}

interface ApiResponseMachine {
  id: string
  machineId: string
  marque?: string | null
  documents?: ApiResponseDoc[]
}

interface ApiCalendarAlert {
  type: string
  severity: string
  label: string
  dueDate: string
  description?: string
}

interface ApiDocumentAlert {
  documentId: string
  title: string
  entityName?: string
  documentType: string
  dueDate: string
  severity: string
  module?: string
}

interface ApiDeadlinesResponse {
  calendarAlerts: ApiCalendarAlert[]
  documentAlerts: ApiDocumentAlert[]
}

// ---------------------------------------------------------
// E2E Workflow Test Suite
// ---------------------------------------------------------
describe('End-to-End ERP Document Management Workflow', () => {
  beforeEach(() => {
    mockSession = null
  })

  // State shared across sequential e2e steps
  let createdClientId: string
  let createdSupplierId: string
  let createdMachineId: string
  let factureVenteId: string
  let factureAchatId: string
  let assuranceDocId: string

  describe('Step 1: Admin Authentication & Gatekeeping', () => {
    it('rejects unauthenticated requests across all API routes with 401', async () => {
      mockSession = null

      const resClients = await getClients()
      expect(resClients.status).toBe(401)

      const resSuppliers = await getSuppliers()
      expect(resSuppliers.status).toBe(401)

      const resMachines = await getMachines()
      expect(resMachines.status).toBe(401)

      const resDeadlines = await getDeadlines(new Request('http://localhost/api/dashboard/deadlines'))
      expect(resDeadlines.status).toBe(401)

      const resOutstanding = await getOutstanding()
      expect(resOutstanding.status).toBe(401)

      const resSearch = await searchDocuments(new Request('http://localhost/api/search?entity=Test'))
      expect(resSearch.status).toBe(401)
    })

    it('authenticates admin user and exposes regulatory calendar alerts', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const res = await getDeadlines(new Request('http://localhost/api/dashboard/deadlines'))
      expect(res.status).toBe(200)

      const json = (await res.json()) as ApiDeadlinesResponse
      expect(json).toHaveProperty('calendarAlerts')
      expect(Array.isArray(json.calendarAlerts)).toBe(true)

      // G50 alert check: between 10th and 20th of the month, G50 should be present
      const today = new Date().getDate()
      const g50Alert = json.calendarAlerts.find((a) => a.type === 'G50')
      if (today >= 10 && today <= 20) {
        expect(g50Alert).toBeDefined()
        expect(g50Alert!.label).toBe('Déclaration G50')
      }
    })
  })

  describe('Step 2: Client CRUD & Facture de Vente Upload', () => {
    it('creates a new client and verifies it in client listing', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const clientPayload = {
        nom: 'SARL Hydra Construction',
        nif: '001234567890123',
        telephone: '021-60-70-80',
        adresse: 'Zone Industrielle Oued Smar, Alger',
      }

      const postRes = await createClient(jsonRequest('/api/clients', clientPayload))
      expect(postRes.status).toBe(201)

      const newClient = (await postRes.json()) as ApiResponseClient
      expect(newClient).toHaveProperty('id')
      expect(newClient.nom).toBe('SARL Hydra Construction')
      createdClientId = newClient.id

      // Verify client appears in listing
      const listRes = await getClients()
      expect(listRes.status).toBe(200)
      const list = (await listRes.json()) as ApiResponseClient[]
      const found = list.find((c) => c.id === createdClientId)
      expect(found).toBeDefined()
      expect(found!.nom).toBe('SARL Hydra Construction')
    })

    it('uploads a Facture de vente with amount and no dueDate linked to the client', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const uploadReq = multipartDocumentRequest({
        title: 'Facture Vente N° 2026-001',
        module: 'CLIENTS',
        documentType: 'FACTURE_VENTE',
        issueDate: '2026-03-15',
        amount: '250000.00',
        isPaid: 'false',
        clientId: createdClientId,
        notes: 'Chantier Tramway Mostaganem',
      })

      const res = await uploadDocument(uploadReq)
      expect(res.status).toBe(201)

      const doc = (await res.json()) as ApiResponseDoc
      expect(doc.id).toBeDefined()
      expect(doc.title).toBe('Facture Vente N° 2026-001')
      expect(doc.amount).toBe(250000)
      expect(doc.dueDate).toBeNull()
      expect(doc.signedUrl).toContain('http://minio/signed/')
      factureVenteId = doc.id
    })

    it('verifies the uploaded invoice appears in the client profile', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const res = await getClientById(new Request(`http://localhost/api/clients/${createdClientId}`), {
        params: Promise.resolve({ id: createdClientId }),
      })
      expect(res.status).toBe(200)

      const clientProfile = (await res.json()) as ApiResponseClient
      expect(clientProfile.id).toBe(createdClientId)
      expect(clientProfile.documents).toHaveLength(1)
      expect(clientProfile.documents![0].id).toBe(factureVenteId)
      expect(clientProfile.documents![0].title).toBe('Facture Vente N° 2026-001')
    })

    it('retrieves single document detail via document endpoint', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const res = await getDocumentById(new Request(`http://localhost/api/documents/${factureVenteId}`), {
        params: Promise.resolve({ id: factureVenteId }),
      })
      expect(res.status).toBe(200)

      const doc = (await res.json()) as ApiResponseDoc
      expect(doc.id).toBe(factureVenteId)
      expect(doc.title).toBe('Facture Vente N° 2026-001')
    })
  })

  describe('Step 3: Supplier CRUD & Facture d\'Achat with Treasury Reconciliation', () => {
    it('creates a new supplier and verifies it in supplier listing and detail', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const supplierPayload = {
        nom: 'EURL Matériaux Modernes Alger',
        nif: '009876543210987',
        telephone: '023-11-22-33',
        adresse: 'Route de Dar El Beida, Alger',
      }

      const postRes = await createSupplier(jsonRequest('/api/fournisseurs', supplierPayload))
      expect(postRes.status).toBe(201)

      const newSupplier = (await postRes.json()) as ApiResponseSupplier
      expect(newSupplier.id).toBeDefined()
      expect(newSupplier.nom).toBe('EURL Matériaux Modernes Alger')
      createdSupplierId = newSupplier.id

      // Verify GET /api/fournisseurs/[id]
      const detailRes = await getSupplierById(
        new Request(`http://localhost/api/fournisseurs/${createdSupplierId}`),
        { params: Promise.resolve({ id: createdSupplierId }) }
      )
      expect(detailRes.status).toBe(200)
      const detail = (await detailRes.json()) as ApiResponseSupplier
      expect(detail.nom).toBe('EURL Matériaux Modernes Alger')
    })

    it('uploads a Facture d\'achat marked as unpaid (isPaid: false) linked to the supplier', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const uploadReq = multipartDocumentRequest({
        title: 'Facture Achat Ciment N° F-4412',
        module: 'FOURNISSEURS',
        documentType: 'FACTURE_ACHAT',
        issueDate: '2026-03-10',
        dueDate: '2026-04-10',
        amount: '120000.00',
        isPaid: 'false',
        fournisseurId: createdSupplierId,
        notes: 'Fourniture sacs de ciment CPJ 42.5',
      })

      const res = await uploadDocument(uploadReq)
      expect(res.status).toBe(201)

      const doc = (await res.json()) as ApiResponseDoc
      expect(doc.id).toBeDefined()
      expect(doc.title).toBe('Facture Achat Ciment N° F-4412')
      expect(doc.isPaid).toBe(false)
      factureAchatId = doc.id
    })

    it('verifies the unpaid purchase invoice appears in Trésorerie outstanding reconciliation', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const res = await getOutstanding()
      expect(res.status).toBe(200)

      const outstandingList = (await res.json()) as ApiResponseDoc[]
      expect(Array.isArray(outstandingList)).toBe(true)

      const purchaseInvoice = outstandingList.find((doc) => doc.id === factureAchatId)
      expect(purchaseInvoice).toBeDefined()
      expect(purchaseInvoice!.title).toBe('Facture Achat Ciment N° F-4412')
      expect(purchaseInvoice!.entityName).toBe('EURL Matériaux Modernes Alger')
      expect(purchaseInvoice!.amount).toBe(120000)
      expect(purchaseInvoice!.formattedAmount).toBe('120\u202f000,00 DZD')
      expect(purchaseInvoice!.isPaid).toBe(false)
    })
  })

  describe('Step 4: Machine CRUD & Assurance Expiration Alert Validation', () => {
    it('creates a new machine and verifies it in materiel listing and detail', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const machinePayload = {
        machineId: 'ENG-CAT-320',
        marque: 'Caterpillar',
        modele: '320D Excavator',
        matricule: '01452-116-16',
        statut: 'ACTIF',
      }

      const postRes = await createMachine(jsonRequest('/api/materiel', machinePayload))
      expect(postRes.status).toBe(201)

      const newMachine = (await postRes.json()) as ApiResponseMachine
      expect(newMachine.id).toBeDefined()
      expect(newMachine.machineId).toBe('ENG-CAT-320')
      createdMachineId = newMachine.id

      // Verify GET /api/materiel/[id]
      const detailRes = await getMachineById(
        new Request(`http://localhost/api/materiel/${createdMachineId}`),
        { params: Promise.resolve({ id: createdMachineId }) }
      )
      expect(detailRes.status).toBe(200)
      const detail = (await detailRes.json()) as ApiResponseMachine
      expect(detail.machineId).toBe('ENG-CAT-320')
    })

    it('rejects an Assurance upload missing dueDate with 400', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const invalidReq = multipartDocumentRequest({
        title: 'Police Assurance 2026',
        module: 'MATERIEL',
        documentType: 'ASSURANCE',
        issueDate: '2026-03-01',
        machineId: createdMachineId,
      })

      const res = await uploadDocument(invalidReq)
      expect(res.status).toBe(400)

      const json = (await res.json()) as { error: string }
      expect(json.error).toContain("La date d'échéance est requise pour ce type de document")
    })

    it('succeeds when Assurance has a valid dueDate 5 days from now', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const now = new Date()
      const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
      const fiveDaysStr = fiveDaysLater.toISOString().slice(0, 10)

      const validReq = multipartDocumentRequest({
        title: 'Assurance Flotte Engins CAT-320',
        module: 'MATERIEL',
        documentType: 'ASSURANCE',
        issueDate: '2026-03-01',
        dueDate: fiveDaysStr,
        machineId: createdMachineId,
      })

      const res = await uploadDocument(validReq)
      expect(res.status).toBe(201)

      const doc = (await res.json()) as ApiResponseDoc
      expect(doc.id).toBeDefined()
      expect(doc.documentType).toBe('ASSURANCE')
      assuranceDocId = doc.id
    })

    it('verifies a red urgent alert appears in Dashboard Deadlines for this machine assurance', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const res = await getDeadlines(new Request('http://localhost/api/dashboard/deadlines'))
      expect(res.status).toBe(200)

      const data = (await res.json()) as ApiDeadlinesResponse
      expect(data).toHaveProperty('documentAlerts')

      const assuranceAlert = data.documentAlerts.find((a) => a.documentId === assuranceDocId)
      expect(assuranceAlert).toBeDefined()
      expect(assuranceAlert!.severity).toBe('red')
      expect(assuranceAlert!.documentType).toBe('ASSURANCE')
      expect(assuranceAlert!.entityName).toContain('ENG-CAT-320')
    })
  })

  describe('Step 5: Bidirectional Document Linking Symmetry', () => {
    it('prevents linking a document to itself', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const res = await createDocumentLink(
        jsonRequest(`/api/documents/${factureAchatId}/links`, { targetId: factureAchatId }),
        { params: { id: factureAchatId } }
      )
      expect(res.status).toBe(400)
      const json = (await res.json()) as { error: string }
      expect(json.error).toContain('Impossible de lier un document à lui-même')
    })

    it('links Facture d\'achat to Facture de vente and verifies 201 response', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const res = await createDocumentLink(
        jsonRequest(`/api/documents/${factureAchatId}/links`, { targetId: factureVenteId }),
        { params: { id: factureAchatId } }
      )
      expect(res.status).toBe(201)
      const body = (await res.json()) as { success: boolean; link: { id: string } }
      expect(body.success).toBe(true)
      expect(body.link.id).toBeDefined()
    })

    it('verifies bidirectional symmetry: both documents show the reciprocal link', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      // 1. Query links from Facture d'achat -> should contain Facture de vente
      const resA = await getDocumentLinks(
        new Request(`http://localhost/api/documents/${factureAchatId}/links`),
        { params: { id: factureAchatId } }
      )
      expect(resA.status).toBe(200)
      const linksA = (await resA.json()) as ApiResponseDoc[]
      expect(linksA).toHaveLength(1)
      expect(linksA[0].id).toBe(factureVenteId)
      expect(linksA[0].title).toBe('Facture Vente N° 2026-001')

      // 2. Query links from Facture de vente -> should contain Facture d'achat (Symmetry)
      const resB = await getDocumentLinks(
        new Request(`http://localhost/api/documents/${factureVenteId}/links`),
        { params: { id: factureVenteId } }
      )
      expect(resB.status).toBe(200)
      const linksB = (await resB.json()) as ApiResponseDoc[]
      expect(linksB).toHaveLength(1)
      expect(linksB[0].id).toBe(factureAchatId)
      expect(linksB[0].title).toBe('Facture Achat Ciment N° F-4412')
    })
  })

  describe('Step 6: Multi-Axis Global Search & Filtering', () => {
    it('filters accurately by client entity name, document type, and date range (3-axis filtering)', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const searchUrl = 'http://localhost/api/search?entity=Hydra&type=FACTURE_VENTE&from=2026-01-01&to=2026-12-31'
      const res = await searchDocuments(new Request(searchUrl))
      expect(res.status).toBe(200)

      const results = (await res.json()) as ApiResponseDoc[]
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(factureVenteId)
      expect(results[0].title).toBe('Facture Vente N° 2026-001')
      expect(results[0].entityName).toBe('SARL Hydra Construction')
    })

    it('returns only supplier documents when searching by supplier entity name', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const searchUrl = 'http://localhost/api/search?entity=Matériaux'
      const res = await searchDocuments(new Request(searchUrl))
      expect(res.status).toBe(200)

      const results = (await res.json()) as ApiResponseDoc[]
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(factureAchatId)
      expect(results[0].title).toBe('Facture Achat Ciment N° F-4412')
    })

    it('returns empty results when filtering with criteria that match nothing', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const searchUrl = 'http://localhost/api/search?type=CONTRAT_TRAVAIL'
      const res = await searchDocuments(new Request(searchUrl))
      expect(res.status).toBe(200)

      const results = (await res.json()) as ApiResponseDoc[]
      expect(results).toHaveLength(0)
    })
  })

  describe('Step 7: PDF Signed URL Refreshing', () => {
    it('generates a fresh signed URL for viewing an uploaded PDF document', async () => {
      mockSession = { user: { id: 'admin-1', email: 'admin@erp.algerie', role: 'ADMIN' } }

      const res = await getDocumentSignedUrl(
        new Request(`http://localhost/api/documents/${factureVenteId}/signed-url`),
        { params: { id: factureVenteId } }
      )
      expect(res.status).toBe(200)

      const json = (await res.json()) as { url: string }
      expect(json).toHaveProperty('url')
      expect(json.url).toContain('http://minio/signed/')
    })
  })
})
