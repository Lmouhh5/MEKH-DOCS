/**
 * @jest-environment node
 */
import { GET as getClusters, POST as createCluster } from './route'
import { GET as getCluster, DELETE as deleteCluster, PATCH as updateCluster } from './[id]/route'
import db from '@/lib/db'

let mockSession: { user: { id: string; email: string; role: string } } | null = null

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => mockSession),
}))

jest.mock('@/lib/minio', () => ({
  getSignedUrl: jest.fn().mockImplementation((key: string) => Promise.resolve(`http://minio/signed/${key}`)),
  deleteFile: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    archiveCluster: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

function authenticatedRequest(url: string, body?: Record<string, unknown>, method?: string) {
  mockSession = { user: { id: 'u1', email: 'admin@erp.local', role: 'ADMIN' } }
  const httpMethod = method || (body ? 'POST' : 'GET')
  return new Request(`http://localhost${url}`, {
    method: httpMethod,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

function unauthenticatedRequest(url: string, body?: Record<string, unknown>, method?: string) {
  mockSession = null
  const httpMethod = method || (body ? 'POST' : 'GET')
  return new Request(`http://localhost${url}`, {
    method: httpMethod,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

describe('Archive Clusters API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = null
  })

  describe('Authentication', () => {
    it('returns 401 when unauthenticated on GET /api/archive/clusters', async () => {
      const res = await getClusters(unauthenticatedRequest('/api/archive/clusters'))
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Non autorisé')
    })

    it('returns 401 when unauthenticated on POST /api/archive/clusters', async () => {
      const res = await createCluster(unauthenticatedRequest('/api/archive/clusters', { name: 'Dossier' }, 'POST'))
      expect(res.status).toBe(401)
    })

    it('returns 401 when unauthenticated on GET /api/archive/clusters/[id]', async () => {
      const res = await getCluster(unauthenticatedRequest('/api/archive/clusters/c1'), {
        params: { id: 'c1' },
      })
      expect(res.status).toBe(401)
    })

    it('returns 401 when unauthenticated on PATCH /api/archive/clusters/[id]', async () => {
      const res = await updateCluster(
        unauthenticatedRequest('/api/archive/clusters/c1', { name: 'Nouveau nom' }, 'PATCH'),
        { params: { id: 'c1' } }
      )
      expect(res.status).toBe(401)
    })

    it('returns 401 when unauthenticated on DELETE /api/archive/clusters/[id]', async () => {
      const res = await deleteCluster(unauthenticatedRequest('/api/archive/clusters/c1', undefined, 'DELETE'), {
        params: { id: 'c1' },
      })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/archive/clusters', () => {
    it('returns recursive document count and lastDocumentDate for root clusters', async () => {
      // Tree:
      // Root 1 (has 1 doc on 2026-02-10)
      //   └─ Child 1.1 (has 1 doc on 2026-03-15)
      //        └─ Child 1.1.1 (has 1 doc on 2026-04-01)
      // Root 2 (empty)
      const mockClusters = [
        {
          id: 'root-1',
          name: 'Affaires Juridiques',
          description: 'Dossiers juridiques',
          parentId: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          documents: [
            { id: 'doc-1', issueDate: new Date('2026-02-10T00:00:00.000Z') },
          ],
        },
        {
          id: 'child-1-1',
          name: 'Contentieux 2026',
          description: null,
          parentId: 'root-1',
          createdAt: new Date('2026-01-05T00:00:00.000Z'),
          updatedAt: new Date('2026-01-05T00:00:00.000Z'),
          documents: [
            { id: 'doc-2', issueDate: new Date('2026-03-15T00:00:00.000Z') },
          ],
        },
        {
          id: 'child-1-1-1',
          name: 'Affaire Sonatrach',
          description: null,
          parentId: 'child-1-1',
          createdAt: new Date('2026-01-10T00:00:00.000Z'),
          updatedAt: new Date('2026-01-10T00:00:00.000Z'),
          documents: [
            { id: 'doc-3', issueDate: new Date('2026-04-01T00:00:00.000Z') },
          ],
        },
        {
          id: 'root-2',
          name: 'Archives Techniques',
          description: 'Plans et notices',
          parentId: null,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          documents: [],
        },
      ]

      ;(db.archiveCluster.findMany as jest.Mock).mockResolvedValue(mockClusters)

      const res = await getClusters(authenticatedRequest('/api/archive/clusters'))
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toHaveLength(2)

      const root1 = data.find((c: { id: string }) => c.id === 'root-1')
      expect(root1).toBeDefined()
      expect(root1.name).toBe('Affaires Juridiques')
      expect(root1.subClustersCount).toBe(1) // direct child
      expect(root1.totalDocumentsCount).toBe(3) // 1 in root + 1 in child + 1 in grandchild
      expect(root1.lastDocumentDate).toBe('2026-04-01T00:00:00.000Z')

      const root2 = data.find((c: { id: string }) => c.id === 'root-2')
      expect(root2).toBeDefined()
      expect(root2.totalDocumentsCount).toBe(0)
      expect(root2.subClustersCount).toBe(0)
      expect(root2.lastDocumentDate).toBeNull()
    })

    it('returns direct children when parentId is passed', async () => {
      const mockClusters = [
        {
          id: 'root-1',
          name: 'Affaires Juridiques',
          parentId: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          documents: [],
        },
        {
          id: 'child-1-1',
          name: 'Contentieux 2026',
          parentId: 'root-1',
          createdAt: new Date('2026-01-05T00:00:00.000Z'),
          updatedAt: new Date('2026-01-05T00:00:00.000Z'),
          documents: [{ id: 'doc-2', issueDate: new Date('2026-03-15T00:00:00.000Z') }],
        },
        {
          id: 'child-1-2',
          name: 'Contrats 2026',
          parentId: 'root-1',
          createdAt: new Date('2026-01-06T00:00:00.000Z'),
          updatedAt: new Date('2026-01-06T00:00:00.000Z'),
          documents: [],
        },
      ]

      ;(db.archiveCluster.findMany as jest.Mock).mockResolvedValue(mockClusters)

      const res = await getClusters(authenticatedRequest('/api/archive/clusters?parentId=root-1'))
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toHaveLength(2)
      expect(data[0].parentId).toBe('root-1')
      expect(data[1].parentId).toBe('root-1')
    })

    it('returns full tree hierarchy when tree=true', async () => {
      const mockClusters = [
        {
          id: 'root-1',
          name: 'Racine',
          parentId: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          documents: [],
        },
        {
          id: 'child-1',
          name: 'Sous-Dossier 1',
          parentId: 'root-1',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          documents: [],
        },
        {
          id: 'child-2',
          name: 'Sous-Dossier 2',
          parentId: 'child-1',
          createdAt: new Date('2026-01-03T00:00:00.000Z'),
          updatedAt: new Date('2026-01-03T00:00:00.000Z'),
          documents: [],
        },
      ]

      ;(db.archiveCluster.findMany as jest.Mock).mockResolvedValue(mockClusters)

      const res = await getClusters(authenticatedRequest('/api/archive/clusters?tree=true'))
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('root-1')
      expect(data[0].children).toHaveLength(1)
      expect(data[0].children[0].id).toBe('child-1')
      expect(data[0].children[0].children).toHaveLength(1)
      expect(data[0].children[0].children[0].id).toBe('child-2')
    })
  })

  describe('POST /api/archive/clusters', () => {
    it('validates name length and requiredness', async () => {
      // Empty name
      const resEmpty = await createCluster(authenticatedRequest('/api/archive/clusters', { name: '   ' }))
      expect(resEmpty.status).toBe(400)

      // Name too long (> 100)
      const resLong = await createCluster(authenticatedRequest('/api/archive/clusters', { name: 'A'.repeat(101) }))
      expect(resLong.status).toBe(400)
    })

    it('returns 404 if parentId does not exist', async () => {
      ;(db.archiveCluster.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await createCluster(
        authenticatedRequest('/api/archive/clusters', { name: 'Nouveau Sous-dossier', parentId: 'non-existent' })
      )
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Dossier parent non trouvé')
    })

    it('creates root cluster and returns 201 Created', async () => {
      const createdCluster = {
        id: 'new-cluster-1',
        name: 'Dossier Marchés 2026',
        description: 'Tous les marchés publics',
        parentId: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }

      ;(db.archiveCluster.create as jest.Mock).mockResolvedValue(createdCluster)

      const res = await createCluster(
        authenticatedRequest('/api/archive/clusters', {
          name: 'Dossier Marchés 2026',
          description: 'Tous les marchés publics',
        })
      )
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.id).toBe('new-cluster-1')
      expect(data.name).toBe('Dossier Marchés 2026')
      expect(db.archiveCluster.create).toHaveBeenCalledWith({
        data: {
          name: 'Dossier Marchés 2026',
          description: 'Tous les marchés publics',
          parentId: null,
        },
      })
    })

    it('creates child cluster when valid parentId is provided', async () => {
      ;(db.archiveCluster.findUnique as jest.Mock).mockResolvedValue({ id: 'parent-1', name: 'Parent' })
      const createdChild = {
        id: 'child-1',
        name: 'Sous-dossier 1',
        description: null,
        parentId: 'parent-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }
      ;(db.archiveCluster.create as jest.Mock).mockResolvedValue(createdChild)

      const res = await createCluster(
        authenticatedRequest('/api/archive/clusters', {
          name: 'Sous-dossier 1',
          parentId: 'parent-1',
        })
      )
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.parentId).toBe('parent-1')
    })
  })

  describe('GET /api/archive/clusters/[id]', () => {
    it('returns 404 when cluster is not found', async () => {
      ;(db.archiveCluster.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await getCluster(authenticatedRequest('/api/archive/clusters/missing'), {
        params: { id: 'missing' },
      })
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Dossier non trouvé')
    })

    it('returns cluster with breadcrumbs, subclusters, and documents with signed URLs', async () => {
      const mockLeafCluster = {
        id: 'cluster-leaf',
        name: 'Sous-Dossier Bâtiment C',
        description: 'Lots électricité',
        parentId: 'cluster-mid',
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        updatedAt: new Date('2026-01-10T00:00:00.000Z'),
        children: [
          {
            id: 'sub-sub-1',
            name: 'Plans C1',
            description: null,
            parentId: 'cluster-leaf',
            createdAt: new Date('2026-01-12T00:00:00.000Z'),
            updatedAt: new Date('2026-01-12T00:00:00.000Z'),
            _count: { documents: 2, children: 0 },
          },
        ],
        documents: [
          {
            id: 'doc-1',
            title: 'Plan technique Bat C',
            documentType: 'ARCHIVE_DOCUMENT',
            module: 'ARCHIVES',
            issueDate: new Date('2026-02-01T00:00:00.000Z'),
            dueDate: null,
            amount: '120000.00',
            isPaid: true,
            physicalLocation: 'Tiroir 3',
            notes: 'Approuvé CTC',
            fileKey: 'archives/doc-1.pdf',
            archiveClusterId: 'cluster-leaf',
            createdAt: new Date('2026-02-01T00:00:00.000Z'),
            updatedAt: new Date('2026-02-01T00:00:00.000Z'),
          },
        ],
      }

      // Hierarchy for breadcrumbs: root -> mid -> leaf
      ;(db.archiveCluster.findUnique as jest.Mock)
        .mockImplementation(async ({ where }: { where: { id: string } }) => {
          if (where.id === 'cluster-leaf') return mockLeafCluster
          if (where.id === 'cluster-mid') return { id: 'cluster-mid', name: 'Marché 2026', parentId: 'cluster-root' }
          if (where.id === 'cluster-root') return { id: 'cluster-root', name: 'Direction Travaux', parentId: null }
          return null
        })

      const res = await getCluster(authenticatedRequest('/api/archive/clusters/cluster-leaf'), {
        params: { id: 'cluster-leaf' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.id).toBe('cluster-leaf')
      expect(data.name).toBe('Sous-Dossier Bâtiment C')

      // Verify breadcrumbs chain from root to current
      expect(data.breadcrumbs).toEqual([
        { id: 'cluster-root', name: 'Direction Travaux' },
        { id: 'cluster-mid', name: 'Marché 2026' },
        { id: 'cluster-leaf', name: 'Sous-Dossier Bâtiment C' },
      ])

      // Verify children
      expect(data.children).toHaveLength(1)
      expect(data.children[0].id).toBe('sub-sub-1')
      expect(data.children[0]._count.documents).toBe(2)

      // Verify documents with signed URLs
      expect(data.documents).toHaveLength(1)
      expect(data.documents[0].id).toBe('doc-1')
      expect(data.documents[0].signedUrl).toBe('http://minio/signed/archives/doc-1.pdf')
      expect(data.documents[0].url).toBe('http://minio/signed/archives/doc-1.pdf')
      expect(data.documents[0].amount).toBe(120000)
    })
  })

  describe('PATCH /api/archive/clusters/[id]', () => {
    it('returns 404 when cluster is not found', async () => {
      ;(db.archiveCluster.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await updateCluster(
        authenticatedRequest('/api/archive/clusters/c999', { name: 'Nouveau' }, 'PATCH'),
        { params: { id: 'c999' } }
      )
      expect(res.status).toBe(404)
    })

    it('rejects invalid names with 400', async () => {
      ;(db.archiveCluster.findUnique as jest.Mock).mockResolvedValue({ id: 'c1', name: 'Ancien' })

      const res = await updateCluster(
        authenticatedRequest('/api/archive/clusters/c1', { name: '' }, 'PATCH'),
        { params: { id: 'c1' } }
      )
      expect(res.status).toBe(400)
    })

    it('updates cluster name and description', async () => {
      ;(db.archiveCluster.findUnique as jest.Mock).mockResolvedValue({ id: 'c1', name: 'Ancien', description: 'Old' })
      ;(db.archiveCluster.update as jest.Mock).mockResolvedValue({
        id: 'c1',
        name: 'Nouveau Nom',
        description: 'New Desc',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const res = await updateCluster(
        authenticatedRequest('/api/archive/clusters/c1', { name: 'Nouveau Nom', description: 'New Desc' }, 'PATCH'),
        { params: { id: 'c1' } }
      )
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.name).toBe('Nouveau Nom')
      expect(db.archiveCluster.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { name: 'Nouveau Nom', description: 'New Desc' },
      })
    })
  })

  describe('DELETE /api/archive/clusters/[id]', () => {
    it('blocks deletion of a non-empty cluster containing documents with 400 Bad Request', async () => {
      ;(db.archiveCluster.findUnique as jest.Mock).mockResolvedValue({
        id: 'cluster-with-doc',
        name: 'Dossier Non Vide',
        children: [],
        documents: [{ id: 'doc-1' }],
      })

      const res = await deleteCluster(
        authenticatedRequest('/api/archive/clusters/cluster-with-doc', undefined, 'DELETE'),
        { params: { id: 'cluster-with-doc' } }
      )
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe(
        "Impossible de supprimer ce dossier : il contient encore des documents ou sous-dossiers. Veuillez d'abord les vider ou les déplacer."
      )
      expect(db.archiveCluster.delete).not.toHaveBeenCalled()
    })

    it('blocks deletion of a non-empty cluster containing subclusters with 400 Bad Request', async () => {
      ;(db.archiveCluster.findUnique as jest.Mock).mockResolvedValue({
        id: 'cluster-with-sub',
        name: 'Dossier Avec Enfants',
        children: [{ id: 'child-1' }],
        documents: [],
      })

      const res = await deleteCluster(
        authenticatedRequest('/api/archive/clusters/cluster-with-sub', undefined, 'DELETE'),
        { params: { id: 'cluster-with-sub' } }
      )
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe(
        "Impossible de supprimer ce dossier : il contient encore des documents ou sous-dossiers. Veuillez d'abord les vider ou les déplacer."
      )
      expect(db.archiveCluster.delete).not.toHaveBeenCalled()
    })

    it('allows deletion of an empty cluster with 200 OK', async () => {
      ;(db.archiveCluster.findUnique as jest.Mock).mockResolvedValue({
        id: 'empty-cluster',
        name: 'Dossier Vide',
        children: [],
        documents: [],
      })
      ;(db.archiveCluster.delete as jest.Mock).mockResolvedValue({ id: 'empty-cluster' })

      const res = await deleteCluster(
        authenticatedRequest('/api/archive/clusters/empty-cluster', undefined, 'DELETE'),
        { params: { id: 'empty-cluster' } }
      )
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(db.archiveCluster.delete).toHaveBeenCalledWith({
        where: { id: 'empty-cluster' },
      })
    })

    it('returns 404 when cluster to delete is not found', async () => {
      ;(db.archiveCluster.findUnique as jest.Mock).mockResolvedValue(null)

      const res = await deleteCluster(
        authenticatedRequest('/api/archive/clusters/missing', undefined, 'DELETE'),
        { params: { id: 'missing' } }
      )
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Dossier non trouvé')
    })
  })
})
