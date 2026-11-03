import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ArchivesPage from './page'
import ClusterWorkspacePage from './[id]/page'
import { ClusterCard } from '@/components/archives/cluster-card'
import { ArchiveDocumentTable } from '@/components/archives/archive-document-table'
import { toast } from 'sonner'

const mockPush = jest.fn()
let mockParamsId = 'cluster-1'

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({
    id: mockParamsId,
  }),
  usePathname: () => `/archives/${mockParamsId}`,
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Archives Module UI Pages & Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockParamsId = 'cluster-1'
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [],
      })
    )
  })

  describe('ArchivesPage (Root Explorer)', () => {
    const mockClusters = [
      {
        id: 'cluster-1',
        name: 'Exploitation & Carrière',
        description: 'Dossier principal carrière 2026',
        parentId: null,
        subClustersCount: 2,
        totalDocumentsCount: 5,
        lastDocumentDate: '2026-03-15T10:00:00.000Z',
      },
      {
        id: 'cluster-2',
        name: 'Fiscalité & Douanes',
        description: 'Bilans et déclarations',
        parentId: null,
        subClustersCount: 0,
        totalDocumentsCount: 0,
        lastDocumentDate: null,
      },
    ]

    it('renders root archives page with title, description, and "+ Nouveau Dossier" button', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusters,
      })

      render(<ArchivesPage />)

      expect(screen.getByText(/08 · Archives & Dossiers/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /\+ Nouveau Dossier/i })
      ).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('Exploitation & Carrière')).toBeInTheDocument()
        expect(screen.getByText('Fiscalité & Douanes')).toBeInTheDocument()
      })
    })

    it('filters clusters using search input', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusters,
      })

      render(<ArchivesPage />)

      await waitFor(() => {
        expect(screen.getByText('Exploitation & Carrière')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/Rechercher un dossier\.\.\./i)
      fireEvent.change(searchInput, { target: { value: 'Douanes' } })

      expect(screen.queryByText('Exploitation & Carrière')).not.toBeInTheDocument()
      expect(screen.getByText('Fiscalité & Douanes')).toBeInTheDocument()
    })

    it('renders empty state when no clusters exist', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      render(<ArchivesPage />)

      await waitFor(() => {
        expect(screen.getByText(/Aucun dossier d'archives/i)).toBeInTheDocument()
      })
    })

    it('opens CreateClusterDialog when "+ Nouveau Dossier" is clicked', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      render(<ArchivesPage />)

      const createBtn = screen.getByRole('button', { name: /\+ Nouveau Dossier/i })
      fireEvent.click(createBtn)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Nouveau Dossier/i })).toBeInTheDocument()
      })
    })
  })

  describe('ClusterWorkspacePage (/archives/[id])', () => {
    const mockClusterDetail = {
      id: 'cluster-1',
      name: 'Exploitation & Carrière',
      description: 'Dossier principal carrière',
      parentId: null,
      breadcrumbs: [{ id: 'cluster-1', name: 'Exploitation & Carrière' }],
      children: [
        {
          id: 'child-1',
          name: 'Bons de pesée Mars 2026',
          description: 'Sous-dossier pesée',
          parentId: 'cluster-1',
          subClustersCount: 0,
          totalDocumentsCount: 3,
          lastDocumentDate: '2026-03-10T08:00:00.000Z',
        },
      ],
      documents: [
        {
          id: 'doc-1',
          title: 'Facture Carburant Mars',
          notes: 'Réf: FC-2026-091',
          issueDate: '2026-03-01T00:00:00.000Z',
          dueDate: '2026-03-31T00:00:00.000Z',
          amount: 145000,
          physicalLocation: 'Armoire A - Rayon 3',
          signedUrl: 'https://minio.local/signed-url-doc-1.pdf',
          fileKey: 'archives/doc-1.pdf',
        },
      ],
    }

    it('renders breadcrumbs, cluster header, sub-clusters and documents table', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusterDetail,
      })

      render(<ClusterWorkspacePage params={Promise.resolve({ id: 'cluster-1' })} />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Exploitation & Carrière' })).toBeInTheDocument()
      })

      // Breadcrumbs
      expect(screen.getByRole('link', { name: /Archives/i })).toBeInTheDocument()

      // Header actions
      expect(screen.getByRole('button', { name: /\+ Nouveau Sous-Dossier/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /\+ Déposer un document/i })).toBeInTheDocument()

      // Sub-clusters
      expect(screen.getByText('Bons de pesée Mars 2026')).toBeInTheDocument()

      // Documents table
      expect(screen.getByText('Facture Carburant Mars')).toBeInTheDocument()
      expect(screen.getByText(/Armoire A - Rayon 3/i)).toBeInTheDocument()
    })

    it('opens UploadArchiveDialog when "+ Déposer un document" is clicked', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusterDetail,
      })

      render(<ClusterWorkspacePage params={Promise.resolve({ id: 'cluster-1' })} />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Exploitation & Carrière' })).toBeInTheDocument()
      })

      const uploadBtn = screen.getByRole('button', { name: /\+ Déposer un document/i })
      fireEvent.click(uploadBtn)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Téléverser un document/i })).toBeInTheDocument()
      })
    })

    it('displays error state when cluster is not found', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Dossier non trouvé' }),
      })

      render(<ClusterWorkspacePage params={Promise.resolve({ id: 'non-existing' })} />)

      await waitFor(() => {
        expect(screen.getByText(/Dossier introuvable/i)).toBeInTheDocument()
      })
    })
  })

  describe('ClusterCard Component', () => {
    const mockCluster = {
      id: 'cluster-10',
      name: 'Maintenance Concasseur',
      description: 'Fiches techniques et réparations',
      totalDocumentsCount: 4,
      subClustersCount: 1,
      lastDocumentDate: '2026-03-20T14:30:00.000Z',
    }

    it('renders cluster information with badges and last document date', () => {
      render(<ClusterCard cluster={mockCluster} />)

      expect(screen.getByText('Maintenance Concasseur')).toBeInTheDocument()
      expect(screen.getByText('Fiches techniques et réparations')).toBeInTheDocument()
      expect(screen.getByText(/4 documents/i)).toBeInTheDocument()
      expect(screen.getByText(/1 sous-dossier/i)).toBeInTheDocument()
      expect(screen.getByText(/20\/03\/2026/i)).toBeInTheDocument()
    })

    it('shows "Aucun document" when cluster has 0 documents', () => {
      render(
        <ClusterCard
          cluster={{
            ...mockCluster,
            totalDocumentsCount: 0,
            lastDocumentDate: null,
          }}
        />
      )

      expect(screen.getByText(/Aucun document/i)).toBeInTheDocument()
    })

    it('links to /archives/[id]', () => {
      render(<ClusterCard cluster={mockCluster} />)

      const link = screen.getByRole('link', { name: /Maintenance Concasseur/i })
      expect(link).toHaveAttribute('href', '/archives/cluster-10')
    })

    it('opens rename dialog and calls PATCH /api/archive/clusters/[id]', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cluster-10', name: 'Maintenance Concasseur V2' }),
      })
      const onRefresh = jest.fn()

      render(<ClusterCard cluster={mockCluster} onRefresh={onRefresh} />)

      const renameBtn = screen.getByRole('button', { name: /Renommer/i })
      fireEvent.click(renameBtn)

      expect(screen.getByRole('heading', { name: /Renommer le dossier/i })).toBeInTheDocument()

      const input = screen.getByLabelText(/Nouveau nom/i)
      fireEvent.change(input, { target: { value: 'Maintenance Concasseur V2' } })

      const submitBtn = screen.getByRole('button', { name: /Enregistrer/i })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/archive/clusters/cluster-10',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ name: 'Maintenance Concasseur V2' }),
          })
        )
        expect(toast.success).toHaveBeenCalledWith('Dossier renommé avec succès')
        expect(onRefresh).toHaveBeenCalled()
      })
    })

    it('opens DeleteClusterDialog when "Supprimer" is clicked', async () => {
      render(<ClusterCard cluster={mockCluster} />)

      const deleteBtn = screen.getByRole('button', { name: /Supprimer/i })
      fireEvent.click(deleteBtn)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Supprimer le dossier/i })).toBeInTheDocument()
      })
    })
  })

  describe('ArchiveDocumentTable Component', () => {
    const mockDocuments = [
      {
        id: 'doc-100',
        title: 'Certificat de Conformité Ciment',
        notes: 'Fournisseur Lafarge GICA',
        issueDate: '2026-02-15T00:00:00.000Z',
        dueDate: '2027-02-15T00:00:00.000Z',
        amount: 350000,
        physicalLocation: 'Rayon C-4',
        signedUrl: 'https://minio.local/conformite.pdf',
        fileKey: 'archives/certif.pdf',
      },
      {
        id: 'doc-101',
        title: 'Assurance Camion Benne',
        notes: 'Police n° 88721',
        issueDate: '2026-01-10T00:00:00.000Z',
        dueDate: null,
        amount: null,
        physicalLocation: null,
        signedUrl: 'https://minio.local/assurance.pdf',
        fileKey: 'archives/assur.pdf',
      },
    ]

    it('renders document table columns, formatted amounts, and dates', () => {
      render(
        <ArchiveDocumentTable
          documents={mockDocuments}
          clusterId="cluster-1"
          clusterName="Exploitation"
        />
      )

      expect(screen.getByText('Certificat de Conformité Ciment')).toBeInTheDocument()
      expect(screen.getByText(/Fournisseur Lafarge GICA/i)).toBeInTheDocument()
      expect(screen.getByText(/Rayon C-4/i)).toBeInTheDocument()
      expect(screen.getByText(/15\/02\/2026/i)).toBeInTheDocument()
      expect(screen.getByText(/15\/02\/2027/i)).toBeInTheDocument()
      expect(screen.getByText(/350\s?000.*DZD/i)).toBeInTheDocument()

      expect(screen.getByText('Assurance Camion Benne')).toBeInTheDocument()
    })

    it('filters documents via inline search', () => {
      render(
        <ArchiveDocumentTable
          documents={mockDocuments}
          clusterId="cluster-1"
        />
      )

      const input = screen.getByPlaceholderText(/Rechercher dans ce dossier\.\.\./i)
      fireEvent.change(input, { target: { value: 'Lafarge' } })

      expect(screen.getByText('Certificat de Conformité Ciment')).toBeInTheDocument()
      expect(screen.queryByText('Assurance Camion Benne')).not.toBeInTheDocument()
    })

    it('renders "Voir PDF" link pointing to signed URL', () => {
      render(
        <ArchiveDocumentTable
          documents={mockDocuments}
          clusterId="cluster-1"
        />
      )

      const pdfLinks = screen.getAllByRole('link', { name: /Voir PDF/i })
      expect(pdfLinks[0]).toHaveAttribute('href', 'https://minio.local/conformite.pdf')
      expect(pdfLinks[0]).toHaveAttribute('target', '_blank')
    })

    it('opens MoveDocumentDialog when "Déplacer" is clicked', async () => {
      render(
        <ArchiveDocumentTable
          documents={mockDocuments}
          clusterId="cluster-1"
        />
      )

      const moveBtns = screen.getAllByRole('button', { name: /Déplacer/i })
      fireEvent.click(moveBtns[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Déplacer le document/i })).toBeInTheDocument()
      })
    })

    it('opens confirmation and calls DELETE /api/archive/documents/[id] when "Supprimer" is confirmed', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      const onRefresh = jest.fn()

      render(
        <ArchiveDocumentTable
          documents={mockDocuments}
          clusterId="cluster-1"
          onRefresh={onRefresh}
        />
      )

      const deleteBtns = screen.getAllByRole('button', { name: /Supprimer/i })
      fireEvent.click(deleteBtns[0])

      expect(
        screen.getByRole('heading', { name: /Supprimer le document/i })
      ).toBeInTheDocument()

      const confirmDeleteBtn = screen.getByRole('button', { name: /Confirmer la suppression/i })
      fireEvent.click(confirmDeleteBtn)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/archive/documents/doc-100',
          expect.objectContaining({ method: 'DELETE' })
        )
        expect(toast.success).toHaveBeenCalledWith('Document supprimé avec succès')
        expect(onRefresh).toHaveBeenCalled()
      })
    })
  })
})
