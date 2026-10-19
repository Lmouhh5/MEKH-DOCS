import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TresoreriePage from './page'
import NouveauDocumentTresoreriePage from './nouveau-document/page'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

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
          <button type="button" onClick={onClose} aria-label="Fermer le panneau">
            Fermer
          </button>
        </div>
      ) : null}
    </div>
  ),
}))

const mockOutstanding = [
  {
    id: 'inv-client-1',
    title: 'Facture Vente Client 101',
    documentType: 'FACTURE_VENTE',
    module: 'CLIENTS',
    issueDate: '2026-03-01T00:00:00.000Z',
    dueDate: '2026-04-01T00:00:00.000Z',
    amount: 150000,
    formattedAmount: '150 000,00 DZD',
    isPaid: false,
    entityName: 'Entreprise Algiers Travaux',
    client: { id: 'c1', nom: 'Entreprise Algiers Travaux' },
    fournisseur: null,
  },
  {
    id: 'inv-fournisseur-1',
    title: 'Facture Achat Ciment 202',
    documentType: 'FACTURE_ACHAT',
    module: 'FOURNISSEURS',
    issueDate: '2026-03-05T00:00:00.000Z',
    dueDate: '2026-04-05T00:00:00.000Z',
    amount: 50000,
    formattedAmount: '50 000,00 DZD',
    isPaid: false,
    entityName: 'Cimenterie Lafarge',
    client: null,
    fournisseur: { id: 'f1', nom: 'Cimenterie Lafarge' },
  },
]

const mockTresorerieDocs = [
  {
    id: 'doc-bank-1',
    title: 'Relevé BNA Mars 2026',
    documentType: 'RELEVE_BANCAIRE',
    module: 'TRESORERIE',
    issueDate: '2026-03-31T00:00:00.000Z',
    amount: 2500000,
    isPaid: null,
  },
  {
    id: 'doc-bank-2',
    title: 'Reçu versement chèque 890',
    documentType: 'RECU_PAIEMENT',
    module: 'TRESORERIE',
    issueDate: '2026-03-15T00:00:00.000Z',
    amount: 120000,
    isPaid: true,
  },
]

describe('TresoreriePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/api/dashboard/outstanding')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockOutstanding,
        })
      }
      if (url.includes('/api/documents?module=TRESORERIE')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockTresorerieDocs,
        })
      }
      if (url.includes('/api/documents/inv-client-1') && init?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ id: 'inv-client-1', isPaid: true }),
        })
      }
      return Promise.reject(new Error(`Unhandled fetch URL: ${url}`))
    })
  })

  it('renders page header with "Trésorerie & Banque" title and "Nouveau document" link', async () => {
    render(<TresoreriePage />)

    expect(
      screen.getByRole('heading', { level: 1, name: /Trésorerie & Banque/i })
    ).toBeInTheDocument()

    const newDocButton = screen.getByRole('link', { name: /Nouveau document/i })
    expect(newDocButton).toBeInTheDocument()
    expect(newDocButton).toHaveAttribute('href', '/tresorerie/nouveau-document')

    await waitFor(() => {
      expect(screen.getByText('Facture Vente Client 101')).toBeInTheDocument()
    })
  })

  it('displays reconciliation key metrics for unpaid sales, unpaid purchases, and net balance', async () => {
    render(<TresoreriePage />)

    await waitFor(() => {
      // 150 000,00 DZD appears in metric card and in the table row
      expect(screen.getAllByText('150 000,00 DZD').length).toBeGreaterThanOrEqual(1)
      // 50 000,00 DZD appears in metric card and in the table row
      expect(screen.getAllByText('50 000,00 DZD').length).toBeGreaterThanOrEqual(1)
      // Net: 150 000 - 50 000 = 100 000,00 DZD
      expect(screen.getByText('100 000,00 DZD')).toBeInTheDocument()
    })

    expect(screen.getByText(/en attente d'encaissement/i)).toBeInTheDocument()
    expect(screen.getByText(/en attente de décaissement/i)).toBeInTheDocument()
  })

  it('renders Section 1: Factures Impayées & Rapprochement table with documents, tiers, amounts and PaidToggle', async () => {
    render(<TresoreriePage />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: /Factures Impayées & Rapprochement/i })
      ).toBeInTheDocument()
      expect(screen.getByText('Facture Vente Client 101')).toBeInTheDocument()
      expect(screen.getByText('Entreprise Algiers Travaux')).toBeInTheDocument()
      expect(screen.getByText('Facture Achat Ciment 202')).toBeInTheDocument()
      expect(screen.getByText('Cimenterie Lafarge')).toBeInTheDocument()
    })

    // Verify switches for PaidToggle are rendered
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(2)
    expect(switches[0]).toHaveAttribute('aria-checked', 'false')
    expect(switches[1]).toHaveAttribute('aria-checked', 'false')
  })

  it('toggles PaidToggle for one-click invoice settlement and updates local status and metrics', async () => {
    render(<TresoreriePage />)

    await waitFor(() => {
      expect(screen.getByText('Facture Vente Client 101')).toBeInTheDocument()
    })

    const switches = screen.getAllByRole('switch')
    await userEvent.click(switches[0])

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/documents/inv-client-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: true }),
      })
    })

    // After settling client invoice, unpaid sales amount becomes 0,00 DZD
    await waitFor(() => {
      expect(screen.getByText('0,00 DZD')).toBeInTheDocument()
      // Net becomes -50 000,00 DZD
      expect(screen.getByText('-50 000,00 DZD')).toBeInTheDocument()
    })
  })

  it('opens DocumentDetailPanel when clicking on a reconciliation table row', async () => {
    render(<TresoreriePage />)

    await waitFor(() => {
      expect(screen.getByText('Facture Vente Client 101')).toBeInTheDocument()
    })

    const titleEl = screen.getByText('Facture Vente Client 101')
    fireEvent.click(titleEl)

    const detailPanel = screen.getByTestId('mock-document-detail-panel')
    expect(detailPanel).toHaveAttribute('data-open', 'true')
    expect(detailPanel).toHaveAttribute('data-docid', 'inv-client-1')
  })

  it('renders Section 2: Documents Bancaires & Justificatifs and filters by document type', async () => {
    render(<TresoreriePage />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: /Documents Bancaires & Justificatifs/i })
      ).toBeInTheDocument()
      expect(screen.getByText('Relevé BNA Mars 2026')).toBeInTheDocument()
      expect(screen.getByText('Reçu versement chèque 890')).toBeInTheDocument()
    })

    // Filter to RELEVE_BANCAIRE only
    const releveFilterBtn = screen.getByRole('button', { name: /Relevés bancaires/i })
    fireEvent.click(releveFilterBtn)

    expect(screen.getByText('Relevé BNA Mars 2026')).toBeInTheDocument()
    expect(screen.queryByText('Reçu versement chèque 890')).not.toBeInTheDocument()

    // Filter to RECU_PAIEMENT only
    const recuFilterBtn = screen.getByRole('button', { name: /Reçus de paiement/i })
    fireEvent.click(recuFilterBtn)

    expect(screen.queryByText('Relevé BNA Mars 2026')).not.toBeInTheDocument()
    expect(screen.getByText('Reçu versement chèque 890')).toBeInTheDocument()

    // Filter back to ALL
    const allFilterBtn = screen.getByRole('button', { name: /Tous/i })
    fireEvent.click(allFilterBtn)

    expect(screen.getByText('Relevé BNA Mars 2026')).toBeInTheDocument()
    expect(screen.getByText('Reçu versement chèque 890')).toBeInTheDocument()
  })

  it('opens DocumentDetailPanel when clicking on a document in Section 2', async () => {
    render(<TresoreriePage />)

    await waitFor(() => {
      expect(screen.getByText('Relevé BNA Mars 2026')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Relevé BNA Mars 2026'))

    const detailPanel = screen.getByTestId('mock-document-detail-panel')
    expect(detailPanel).toHaveAttribute('data-open', 'true')
    expect(detailPanel).toHaveAttribute('data-docid', 'doc-bank-1')
  })
})

describe('NouveauDocumentTresoreriePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders header, return link, and DocumentUploadForm configured for TRESORERIE module', () => {
    render(<NouveauDocumentTresoreriePage />)

    expect(
      screen.getByRole('heading', { level: 1, name: /Nouveau Document de Trésorerie/i })
    ).toBeInTheDocument()

    const backLink = screen.getByRole('link', { name: /Retour à la trésorerie/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/tresorerie')

    // Verify form rendered with DocumentUploadForm
    expect(screen.getByRole('form', { name: /Téléverser un document/i })).toBeInTheDocument()

    // DocumentType dropdown options strictly contain RELEVE_BANCAIRE and RECU_PAIEMENT
    const select = screen.getByLabelText(/Type de document \*/i) as HTMLSelectElement
    const optionValues = Array.from(select.options).map((opt) => opt.value)

    expect(optionValues).toContain('')
    expect(optionValues).toContain('RELEVE_BANCAIRE')
    expect(optionValues).toContain('RECU_PAIEMENT')
    // Ensure no other module document types (e.g., FACTURE_VENTE, CARTE_GRISE, G50) are present
    expect(optionValues).not.toContain('FACTURE_VENTE')
    expect(optionValues).not.toContain('CARTE_GRISE')
    expect(optionValues).not.toContain('G50')
    expect(optionValues).toHaveLength(3) // empty + 2 types
  })
})
