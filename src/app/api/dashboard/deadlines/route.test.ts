/**
 * @jest-environment node
 */
import { GET } from './route'
import db from '@/lib/db'

let mockSession: { user: { id: string; email: string; role: string } } | null = null

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => mockSession),
}))

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    document: {
      findMany: jest.fn(),
    },
    manualDeadline: {
      findMany: jest.fn(),
    },
  },
}))

function authenticatedRequest() {
  mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
  return new Request('http://localhost/api/dashboard/deadlines')
}

describe('GET /api/dashboard/deadlines', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  it('returns 401 if unauthenticated', async () => {
    const res = await GET(new Request('http://localhost/api/dashboard/deadlines'))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Non autorisé')
  })

  it('returns calendarAlerts, documentAlerts, and manualAlerts', async () => {
    const now = new Date()
    const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
    const twentyDaysLater = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)
    const fiftyDaysLater = new Date(now.getTime() + 50 * 24 * 60 * 60 * 1000)

    const mockDocs = [
      {
        id: 'doc-1',
        title: 'Assurance Camion',
        documentType: 'ASSURANCE',
        module: 'MATERIEL',
        issueDate: new Date('2025-10-10'),
        dueDate: fiveDaysLater,
        machineId: 'm1',
        machine: { machineId: 'CAM-01', marque: 'Volvo' },
        client: null,
        fournisseur: null,
        travailleur: null,
      },
      {
        id: 'doc-2',
        title: 'Contrat Client B',
        documentType: 'CONTRAT_CLIENT',
        module: 'CLIENTS',
        issueDate: new Date('2025-10-10'),
        dueDate: twentyDaysLater,
        clientId: 'c1',
        client: { nom: 'Societe Alpha' },
        fournisseur: null,
        machine: null,
        travailleur: null,
      },
      {
        id: 'doc-3',
        title: 'Facture Lointaine',
        documentType: 'FACTURE_VENTE',
        module: 'CLIENTS',
        issueDate: new Date('2025-10-10'),
        dueDate: fiftyDaysLater,
        clientId: 'c1',
        client: { nom: 'Societe Alpha' },
        fournisseur: null,
        machine: null,
        travailleur: null,
      },
    ]

    const mockManual = [
      {
        id: 'man-1',
        label: 'Renouvellement Agrément',
        dueDate: fiveDaysLater,
        yellowDaysBefore: 30,
        redDaysBefore: 7,
      },
      {
        id: 'man-2',
        label: 'Audit Annuel',
        dueDate: fiftyDaysLater,
        yellowDaysBefore: 30,
        redDaysBefore: 7,
      },
    ]

    ;(db.document.findMany as jest.Mock).mockResolvedValueOnce(mockDocs)
    ;(db.manualDeadline.findMany as jest.Mock).mockResolvedValueOnce(mockManual)

    const res = await GET(authenticatedRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toHaveProperty('calendarAlerts')
    expect(json).toHaveProperty('documentAlerts')
    expect(json).toHaveProperty('manualAlerts')

    // Document alerts should exclude doc-3 (50 days later > 30 warn days)
    expect(json.documentAlerts).toHaveLength(2)
    expect(json.documentAlerts[0].documentId).toBe('doc-1')
    expect(json.documentAlerts[0].severity).toBe('red')
    expect(json.documentAlerts[0].entityName).toBe('CAM-01 - Volvo')

    expect(json.documentAlerts[1].documentId).toBe('doc-2')
    expect(json.documentAlerts[1].severity).toBe('yellow')
    expect(json.documentAlerts[1].entityName).toBe('Societe Alpha')

    // Manual alerts should exclude man-2 (50 days later)
    expect(json.manualAlerts).toHaveLength(1)
    expect(json.manualAlerts[0].id).toBe('man-1')
    expect(json.manualAlerts[0].severity).toBe('red')
  })
})
