import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WorkerProfilePage from './page'

const mockPush = jest.fn()
const mockRouter = { push: mockPush }

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'worker-1' }),
  useRouter: () => mockRouter,
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/components/documents/document-detail-panel', () => ({
  DocumentDetailPanel: ({ documentId, isOpen }: { documentId: string | null; isOpen: boolean }) => (
    <div data-testid="mock-document-detail-panel" data-open={isOpen} data-docid={documentId || ''}>
      {isOpen ? `Panel for ${documentId}` : null}
    </div>
  ),
}))

jest.mock('@/components/entities/entity-document-list', () => ({
  EntityDocumentList: ({
    title,
    initialDocuments,
  }: {
    title?: string
    initialDocuments?: unknown[]
  }) => (
    <div data-testid="mock-entity-document-list">
      <span>{title}</span>
      <span data-testid="other-docs-count">{initialDocuments?.length ?? 0}</span>
    </div>
  ),
}))

const mockWorkerData = {
  id: 'worker-1',
  nom: 'Ahmed Benali',
  numeroIdentification: '109283745',
  dateDebutContrat: '2024-01-15T00:00:00.000Z',
  numeroCnas: '84 1234 5678 90',
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
  documents: [
    {
      id: 'doc-paie-oct',
      title: 'Fiche paie A',
      documentType: 'FICHE_DE_PAIE',
      module: 'PERSONNEL',
      issueDate: '2026-10-31T00:00:00.000Z',
      amount: 75000,
    },
    {
      id: 'doc-paie-sep',
      title: 'Fiche paie B',
      documentType: 'FICHE_DE_PAIE',
      module: 'PERSONNEL',
      issueDate: '2026-09-30T00:00:00.000Z',
      amount: 75000,
    },
    {
      id: 'doc-contrat',
      title: 'Contrat de travail CDI',
      documentType: 'CONTRAT_TRAVAIL',
      module: 'PERSONNEL',
      issueDate: '2024-01-15T00:00:00.000Z',
    },
    {
      id: 'doc-cin',
      title: 'Copie Carte Nationale',
      documentType: 'PIECE_IDENTITE',
      module: 'PERSONNEL',
      issueDate: '2024-01-10T00:00:00.000Z',
    },
  ],
}

describe('WorkerProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/personnel/worker-1')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockWorkerData,
        })
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`))
    })
  })

  it('loads and displays employee information', async () => {
    render(<WorkerProfilePage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Ahmed Benali/i })).toBeInTheDocument()
      expect(screen.getByText('109283745')).toBeInTheDocument()
      expect(screen.getByText('84 1234 5678 90')).toBeInTheDocument()
    })
  })

  it('groups fiches de paie by month/year in descending order with French labels', async () => {
    render(<WorkerProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Fiche paie A')).toBeInTheDocument()
      expect(screen.getByText('Fiche paie B')).toBeInTheDocument()
    })

    const monthHeaders = screen.getAllByRole('button', { name: /réduire|afficher/i })
    expect(monthHeaders).toHaveLength(2)
    expect(monthHeaders[0]).toHaveTextContent(/Octobre 2026/i)
    expect(monthHeaders[1]).toHaveTextContent(/Septembre 2026/i)

    // Check other HR documents are passed to EntityDocumentList
    expect(screen.getByTestId('other-docs-count')).toHaveTextContent('2')
  })

  it('opens DocumentDetailPanel when clicking Aperçu on a fiche de paie', async () => {
    render(<WorkerProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Fiche paie A')).toBeInTheDocument()
    })

    const apercuButtons = screen.getAllByRole('button', { name: /aperçu/i })
    expect(apercuButtons.length).toBeGreaterThanOrEqual(1)

    await userEvent.click(apercuButtons[0])

    const panel = screen.getByTestId('mock-document-detail-panel')
    expect(panel).toHaveAttribute('data-open', 'true')
    expect(panel).toHaveAttribute('data-docid', 'doc-paie-oct')
  })

  it('toggles collapsible month section', async () => {
    render(<WorkerProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Fiche paie A')).toBeInTheDocument()
    })

    const monthHeaders = screen.getAllByRole('button', { name: /réduire|afficher/i })
    fireEvent.click(monthHeaders[0])

    // After collapsing, the document inside is hidden
    expect(screen.queryByText('Fiche paie A')).not.toBeInTheDocument()

    // Click again to re-expand
    fireEvent.click(monthHeaders[0])
    expect(screen.getByText('Fiche paie A')).toBeInTheDocument()
  })
})
