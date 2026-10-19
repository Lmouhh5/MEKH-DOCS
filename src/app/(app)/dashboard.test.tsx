import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import DashboardPage from './page'

const mockDeadlinesData = {
  calendarAlerts: [
    {
      type: 'G50',
      severity: 'red',
      label: 'Déclaration G50',
      dueDate: new Date('2026-10-20T00:00:00Z').toISOString(),
      description: 'Déclaration fiscale mensuelle (série G n° 50) due le 20 du mois.',
    },
    {
      type: 'CNAS',
      severity: 'yellow',
      label: 'Déclaration CNAS',
      dueDate: new Date('2026-12-31T00:00:00Z').toISOString(),
      description: "Déclaration d'assiette des cotisations trimestrielle CNAS.",
    },
  ],
  documentAlerts: [
    {
      documentId: 'doc-overdue-1',
      title: 'Assurance Pelle sur chenilles',
      entityName: 'ENG-01 - CAT',
      documentType: 'ASSURANCE',
      dueDate: new Date('2026-10-01T00:00:00Z').toISOString(),
      severity: 'overdue',
      module: 'MATERIEL',
    },
    {
      documentId: 'doc-warn-2',
      title: 'Contrat Travail Chauffeur',
      entityName: 'Karim Bennacer',
      documentType: 'CONTRAT_TRAVAIL',
      dueDate: new Date('2026-11-10T00:00:00Z').toISOString(),
      severity: 'yellow',
      module: 'PERSONNEL',
    },
  ],
  manualAlerts: [
    {
      id: 'man-1',
      label: 'Renouvellement agrément',
      dueDate: new Date('2026-10-25T00:00:00Z').toISOString(),
      severity: 'red',
      yellowDaysBefore: 30,
      redDaysBefore: 7,
    },
  ],
}

const mockOutstandingData = [
  {
    id: 'inv-1',
    title: 'Facture vente 2026-001',
    documentType: 'FACTURE_VENTE',
    module: 'CLIENTS',
    issueDate: '2026-09-01T00:00:00Z',
    dueDate: '2026-10-01T00:00:00Z',
    amount: 250000,
    formattedAmount: '250 000,00 DZD',
    isPaid: false,
    entityName: 'Entreprise Nationale de BTP',
  },
]

const mockManualData = [
  {
    id: 'man-1',
    label: 'Renouvellement agrément',
    dueDate: '2026-10-25T00:00:00Z',
    yellowDaysBefore: 30,
    redDaysBefore: 7,
  },
]

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/components/documents/document-detail-panel', () => ({
  DocumentDetailPanel: ({
    documentId,
    isOpen,
    onClose,
  }: {
    documentId: string | null
    isOpen: boolean
    onClose: () => void
  }) => (
    <div
      data-testid="mock-document-detail-panel"
      data-open={isOpen ? 'true' : 'false'}
      data-docid={documentId || ''}
    >
      {isOpen ? (
        <div>
          <span>Detail panel for {documentId}</span>
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>
      ) : null}
    </div>
  ),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/deadlines')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDeadlinesData),
        })
      }
      if (url.includes('/api/dashboard/outstanding')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOutstandingData),
        })
      }
      if (url.includes('/api/dashboard/manual-deadlines')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockManualData),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    }) as jest.Mock
  })

  it('renders loading state initially and then renders dashboard content', async () => {
    render(<DashboardPage />)

    expect(screen.getByText(/Chargement du tableau de bord/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Tableau de Suivi des Échéances')).toBeInTheDocument()
    })
  })

  it('renders executive KPI cards accurately', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('kpi-urgent-alerts')).toBeInTheDocument()
      expect(screen.getByTestId('kpi-outstanding-invoices')).toBeInTheDocument()
      expect(screen.getByTestId('kpi-upcoming-deadlines')).toBeInTheDocument()
    })

    // Urgent alerts: G50 (red) + Assurance (overdue) + Renouvellement agrément (red) = 3
    const urgentKpi = screen.getByTestId('kpi-urgent-alerts')
    expect(urgentKpi).toHaveTextContent('3')

    // Outstanding invoices: 250 000,00 DZD and 1 facture
    const unpaidKpi = screen.getByTestId('kpi-outstanding-invoices')
    expect(unpaidKpi).toHaveTextContent('250 000,00 DZD')
    expect(unpaidKpi).toHaveTextContent('1 facture')

    // Upcoming deadlines: 2 calendar + 2 documents + 1 manual = 5
    const upcomingKpi = screen.getByTestId('kpi-upcoming-deadlines')
    expect(upcomingKpi).toHaveTextContent('5')
  })

  it('renders all four sections with their expected content', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      // 1. Calendar alerts section
      expect(screen.getByText('Échéances Réglementaires & Fiscales')).toBeInTheDocument()
      expect(screen.getByText('Déclaration G50')).toBeInTheDocument()
      expect(screen.getByText('Déclaration CNAS')).toBeInTheDocument()

      // 2. Document alerts section
      expect(screen.getByText('Échéances Documentaires')).toBeInTheDocument()
      expect(screen.getByText('Assurance Pelle sur chenilles')).toBeInTheDocument()
      expect(screen.getByText('En retard')).toBeInTheDocument()
      expect(screen.getByText('Contrat Travail Chauffeur')).toBeInTheDocument()

      // 3. Outstanding invoices section
      expect(screen.getByText('Factures Impayées & En-cours')).toBeInTheDocument()
      expect(screen.getByText('Facture vente 2026-001')).toBeInTheDocument()
      expect(screen.getByText('Entreprise Nationale de BTP')).toBeInTheDocument()

      // 4. Manual deadlines section
      expect(screen.getByText('Échéances Personnalisées')).toBeInTheDocument()
      expect(screen.getByText('Renouvellement agrément')).toBeInTheDocument()
    })
  })

  it('clicking a document alert opens the document detail panel', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Assurance Pelle sur chenilles')).toBeInTheDocument()
    })

    const docRow = screen.getByTestId('document-alert-item-doc-overdue-1')
    fireEvent.click(docRow)

    await waitFor(() => {
      const panels = screen.getAllByTestId('mock-document-detail-panel')
      const activePanel = panels.find((p) => p.getAttribute('data-open') === 'true')
      expect(activePanel).toBeDefined()
      expect(activePanel).toHaveAttribute('data-docid', 'doc-overdue-1')
    })
  })

  it('handles error state when API fails', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network failure'))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(
        screen.getByText(/Impossible de charger les données du tableau de bord/i)
      ).toBeInTheDocument()
    })
  })
})
