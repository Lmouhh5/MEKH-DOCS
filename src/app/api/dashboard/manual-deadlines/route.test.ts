/**
 * @jest-environment node
 */
import { GET, POST } from './route'
import { DELETE } from './[id]/route'
import db from '@/lib/db'

let mockSession: { user: { id: string; email: string; role: string } } | null = null

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => mockSession),
}))

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    manualDeadline: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

function authenticatedRequest(url: string, init?: RequestInit) {
  mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
  return new Request(`http://localhost${url}`, init)
}

describe('Manual Deadlines API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/dashboard/manual-deadlines', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await GET(new Request('http://localhost/api/dashboard/manual-deadlines'))
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBe('Non autorisé')
    })

    it('returns list of manual deadlines', async () => {
      const mockList = [
        {
          id: 'md-1',
          label: 'Renouvellement agrément',
          dueDate: new Date('2026-11-15T00:00:00Z'),
          yellowDaysBefore: 30,
          redDaysBefore: 7,
        },
      ]
      ;(db.manualDeadline.findMany as jest.Mock).mockResolvedValueOnce(mockList)

      const res = await GET(authenticatedRequest('/api/dashboard/manual-deadlines'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(1)
      expect(data[0].label).toBe('Renouvellement agrément')
    })
  })

  describe('POST /api/dashboard/manual-deadlines', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await POST(
        new Request('http://localhost/api/dashboard/manual-deadlines', {
          method: 'POST',
          body: JSON.stringify({ label: 'Test', dueDate: '2026-12-01' }),
        })
      )
      expect(res.status).toBe(401)
    })

    it('returns 400 if label is missing or empty', async () => {
      const res = await POST(
        authenticatedRequest('/api/dashboard/manual-deadlines', {
          method: 'POST',
          body: JSON.stringify({ label: '   ', dueDate: '2026-12-01' }),
        })
      )
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Le libellé est requis')
    })

    it('returns 400 if dueDate is invalid', async () => {
      const res = await POST(
        authenticatedRequest('/api/dashboard/manual-deadlines', {
          method: 'POST',
          body: JSON.stringify({ label: 'Audit', dueDate: 'invalid-date' }),
        })
      )
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe("Date d'échéance invalide")
    })

    it('returns 400 if yellowDaysBefore is less than redDaysBefore', async () => {
      const res = await POST(
        authenticatedRequest('/api/dashboard/manual-deadlines', {
          method: 'POST',
          body: JSON.stringify({
            label: 'Inspection',
            dueDate: '2026-12-01',
            yellowDaysBefore: 5,
            redDaysBefore: 15,
          }),
        })
      )
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Le seuil jaune doit être supérieur ou égal au seuil rouge')
    })

    it('creates manual deadline with default thresholds (30, 7) and returns 201', async () => {
      const createdItem = {
        id: 'md-new',
        label: 'Visite médicale',
        dueDate: new Date('2026-12-10T00:00:00Z'),
        yellowDaysBefore: 30,
        redDaysBefore: 7,
      }
      ;(db.manualDeadline.create as jest.Mock).mockResolvedValueOnce(createdItem)

      const res = await POST(
        authenticatedRequest('/api/dashboard/manual-deadlines', {
          method: 'POST',
          body: JSON.stringify({ label: 'Visite médicale', dueDate: '2026-12-10' }),
        })
      )
      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.id).toBe('md-new')
      expect(db.manualDeadline.create).toHaveBeenCalledWith({
        data: {
          label: 'Visite médicale',
          dueDate: expect.any(Date),
          yellowDaysBefore: 30,
          redDaysBefore: 7,
        },
      })
    })

    it('creates manual deadline with custom thresholds and returns 201', async () => {
      const createdItem = {
        id: 'md-custom',
        label: 'Contrôle extincteurs',
        dueDate: new Date('2026-12-10T00:00:00Z'),
        yellowDaysBefore: 45,
        redDaysBefore: 14,
      }
      ;(db.manualDeadline.create as jest.Mock).mockResolvedValueOnce(createdItem)

      const res = await POST(
        authenticatedRequest('/api/dashboard/manual-deadlines', {
          method: 'POST',
          body: JSON.stringify({
            label: 'Contrôle extincteurs',
            dueDate: '2026-12-10',
            yellowDaysBefore: 45,
            redDaysBefore: 14,
          }),
        })
      )
      expect(res.status).toBe(201)
      expect(db.manualDeadline.create).toHaveBeenCalledWith({
        data: {
          label: 'Contrôle extincteurs',
          dueDate: expect.any(Date),
          yellowDaysBefore: 45,
          redDaysBefore: 14,
        },
      })
    })
  })

  describe('DELETE /api/dashboard/manual-deadlines/[id]', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await DELETE(
        new Request('http://localhost/api/dashboard/manual-deadlines/md-1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'md-1' }) }
      )
      expect(res.status).toBe(401)
    })

    it('returns 404 if deadline does not exist', async () => {
      ;(db.manualDeadline.findUnique as jest.Mock).mockResolvedValueOnce(null)

      const res = await DELETE(
        authenticatedRequest('/api/dashboard/manual-deadlines/md-999', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'md-999' }) }
      )
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error).toBe('Échéance non trouvée')
    })

    it('deletes deadline and returns 200', async () => {
      ;(db.manualDeadline.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'md-1' })
      ;(db.manualDeadline.delete as jest.Mock).mockResolvedValueOnce({ id: 'md-1' })

      const res = await DELETE(
        authenticatedRequest('/api/dashboard/manual-deadlines/md-1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'md-1' }) }
      )
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.message).toBe('Échéance supprimée')
      expect(db.manualDeadline.delete).toHaveBeenCalledWith({ where: { id: 'md-1' } })
    })
  })
})
