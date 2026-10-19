import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import FiscalitePage from './page'
import NouveauDocumentFiscalitePage from './nouveau-document/page'

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

const mockFiscaliteDocs = [
  {
    id: 'doc-g50-1',
    title: 'G50 Février 2026',
    documentType: 'G50',
    module: 'FISCALITE',
    issueDate: '2026-03-20T00:00:00.000Z',
    dueDate: '2026-03-20T00:00:00.000Z',
    amount: 450000,
    isPaid: true,
  },
  {
    id: 'doc-g50-2',
    title: 'G50 Janvier 2026',
    documentType: 'G50',
    module: 'FISCALITE',
    issueDate: '2026-02-20T00:00:00.000Z',
    dueDate: '2026-02-20T00:00:00.000Z',
    amount: 380000,
    isPaid: true,
  },
  {
    id: 'doc-etat104-1',
    title: 'État 104 Année 2025',
    documentType: 'ETAT_104',
    module: 'FISCALITE',
    issueDate: '2026-04-30T00:00:00.000Z',
    dueDate: '2026-04-30T00:00:00.000Z',
    amount: null,
    isPaid: null,
  },
  {
    id: 'doc-cnas-1',
    title: 'Déclaration CNAS T1 2026',
    documentType: 'CNAS_DECLARATION',
    module: 'FISCALITE',
    issueDate: '2026-04-15T00:00:00.000Z',
    dueDate: '2026-04-30T00:00:00.000Z',
    amount: 620000,
    isPaid: false,
  },
  {
    id: 'doc-cacobatph-1',
    title: 'Cotisation CACOBATPH Mars 2026',
    documentType: 'CACOBATPH',
    module: 'FISCALITE',
    issueDate: '2026-03-25T00:00:00.000Z',
    dueDate: '2026-03-31T00:00:00.000Z',
    amount: 195000,
    isPaid: null,
  },
]

describe('FiscalitePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/documents?module=FISCALITE')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockFiscaliteDocs,
        })
      }
      return Promise.reject(new Error(`Unhandled fetch URL: ${url}`))
    })
  })

  it('renders page header with "Fiscalité & Déclarations Administratives" and "Nouveau document fiscal / social" button', async () => {
    render(<FiscalitePage />)

    expect(
      screen.getByRole('heading', { level: 1, name: /Fiscalité & Déclarations Administratives/i })
    ).toBeInTheDocument()

    const newDocButton = screen.getByRole('link', {
      name: /Nouveau document fiscal \/ social/i,
    })
    expect(newDocButton).toBeInTheDocument()
    expect(newDocButton).toHaveAttribute('href', '/fiscalite/nouveau-document')

    await waitFor(() => {
      expect(screen.getByText('G50 Février 2026')).toBeInTheDocument()
    })
  })

  it('displays overview metrics cards for total, fiscal obligations, and social organisms', async () => {
    render(<FiscalitePage />)

    await waitFor(() => {
      // Total declarations: 5
      expect(screen.getByText('5')).toBeInTheDocument()
      // Fiscal obligations: 3 (2 G50 + 1 ETAT_104)
      expect(screen.getByText('3')).toBeInTheDocument()
      // Social organisms: 2 (1 CNAS + 1 CACOBATPH)
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    expect(screen.getByText(/G50, G4, G12, G40, État 104, RC/i)).toBeInTheDocument()
    expect(screen.getAllByText(/CNAS, CASNOS, CACOBATPH/i).length).toBeGreaterThanOrEqual(1)
  })

  it('groups documents by documentType label and displays count badge and latest declaration date', async () => {
    render(<FiscalitePage />)

    await waitFor(() => {
      expect(screen.getByTestId('group-section-G50')).toBeInTheDocument()
      expect(screen.getByTestId('group-section-ETAT_104')).toBeInTheDocument()
      expect(screen.getByTestId('group-section-CNAS_DECLARATION')).toBeInTheDocument()
      expect(screen.getByTestId('group-section-CACOBATPH')).toBeInTheDocument()
    })

    // G50 group: 2 documents, latest declaration 20/03/2026
    const g50Section = screen.getByTestId('group-section-G50')
    expect(g50Section).toHaveTextContent('G50')
    expect(g50Section).toHaveTextContent('2 documents')
    expect(g50Section).toHaveTextContent('Dernière déclaration : 20/03/2026')
    expect(g50Section).toHaveTextContent('G50 Février 2026')
    expect(g50Section).toHaveTextContent('G50 Janvier 2026')

    // État 104 group: 1 document, latest declaration 30/04/2026
    const etat104Section = screen.getByTestId('group-section-ETAT_104')
    expect(etat104Section).toHaveTextContent('État 104')
    expect(etat104Section).toHaveTextContent('1 document')
    expect(etat104Section).toHaveTextContent('Dernière déclaration : 30/04/2026')

    // CNAS group: 1 document
    const cnasSection = screen.getByTestId('group-section-CNAS_DECLARATION')
    expect(cnasSection).toHaveTextContent('Déclaration CNAS')
    expect(cnasSection).toHaveTextContent('1 document')
  })

  it('filters by category: Obligations Fiscales vs Organismes Sociaux vs Tous', async () => {
    render(<FiscalitePage />)

    await waitFor(() => {
      expect(screen.getByText('G50 Février 2026')).toBeInTheDocument()
    })

    // Filter to Obligations Fiscales
    const fiscalFilterBtn = screen.getByRole('button', { name: /Obligations Fiscales/i })
    fireEvent.click(fiscalFilterBtn)

    expect(screen.getByTestId('group-section-G50')).toBeInTheDocument()
    expect(screen.getByTestId('group-section-ETAT_104')).toBeInTheDocument()
    expect(screen.queryByTestId('group-section-CNAS_DECLARATION')).not.toBeInTheDocument()
    expect(screen.queryByTestId('group-section-CACOBATPH')).not.toBeInTheDocument()

    // Filter to Organismes Sociaux
    const socialFilterBtn = screen.getByRole('button', { name: /Organismes Sociaux/i })
    fireEvent.click(socialFilterBtn)

    expect(screen.queryByTestId('group-section-G50')).not.toBeInTheDocument()
    expect(screen.queryByTestId('group-section-ETAT_104')).not.toBeInTheDocument()
    expect(screen.getByTestId('group-section-CNAS_DECLARATION')).toBeInTheDocument()
    expect(screen.getByTestId('group-section-CACOBATPH')).toBeInTheDocument()

    // Filter back to Tous
    const allFilterBtn = screen.getByRole('button', { name: /Tous/i })
    fireEvent.click(allFilterBtn)

    expect(screen.getByTestId('group-section-G50')).toBeInTheDocument()
    expect(screen.getByTestId('group-section-ETAT_104')).toBeInTheDocument()
    expect(screen.getByTestId('group-section-CNAS_DECLARATION')).toBeInTheDocument()
    expect(screen.getByTestId('group-section-CACOBATPH')).toBeInTheDocument()
  })

  it('toggles collapsible section to hide and show documents within a group', async () => {
    render(<FiscalitePage />)

    await waitFor(() => {
      expect(screen.getByText('G50 Février 2026')).toBeInTheDocument()
    })

    const g50Section = screen.getByTestId('group-section-G50')
    const headerToggle = g50Section.querySelector('[role="button"]')!
    expect(headerToggle).toBeInTheDocument()

    // Initially expanded
    expect(headerToggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('G50 Février 2026')).toBeInTheDocument()

    // Click header to collapse
    fireEvent.click(headerToggle)
    expect(headerToggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('G50 Février 2026')).not.toBeInTheDocument()

    // Click header again to expand
    fireEvent.click(headerToggle)
    expect(headerToggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('G50 Février 2026')).toBeInTheDocument()
  })

  it('opens DocumentDetailPanel when clicking on any document card', async () => {
    render(<FiscalitePage />)

    await waitFor(() => {
      expect(screen.getByText('G50 Février 2026')).toBeInTheDocument()
    })

    const docCardTitle = screen.getByText('G50 Février 2026')
    fireEvent.click(docCardTitle)

    const detailPanel = screen.getByTestId('mock-document-detail-panel')
    expect(detailPanel).toHaveAttribute('data-open', 'true')
    expect(detailPanel).toHaveAttribute('data-docid', 'doc-g50-1')
  })

  it('renders empty state when no documents exist', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [],
      })
    )

    render(<FiscalitePage />)

    await waitFor(() => {
      expect(
        screen.getByText('Aucun document fiscal ou social enregistré')
      ).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /Ajouter un premier document/i })).toBeInTheDocument()
  })
})

describe('NouveauDocumentFiscalitePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders header, return link, informational note encouraging due date, and upload form scoped to FISCALITE', () => {
    render(<NouveauDocumentFiscalitePage />)

    expect(
      screen.getByRole('heading', { level: 1, name: /Nouveau Document Fiscal ou Social/i })
    ).toBeInTheDocument()

    const backLink = screen.getByRole('link', { name: /Retour à la fiscalité/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/fiscalite')

    // Note encouraging entering dueDate
    expect(screen.getByText(/Rappel des échéances périodiques/i)).toBeInTheDocument()
    expect(screen.getAllByText(/G50/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/20 du mois/i)).toBeInTheDocument()

    // Upload form
    expect(screen.getByRole('form', { name: /Téléverser un document/i })).toBeInTheDocument()

    // DocumentType dropdown options strictly restricted to FISCALITE types
    const select = screen.getByLabelText(/Type de document \*/i) as HTMLSelectElement
    const optionValues = Array.from(select.options).map((opt) => opt.value)

    expect(optionValues).toContain('')
    expect(optionValues).toContain('REGISTRE_COMMERCE')
    expect(optionValues).toContain('G50')
    expect(optionValues).toContain('G4')
    expect(optionValues).toContain('G12')
    expect(optionValues).toContain('G40')
    expect(optionValues).toContain('ETAT_104')
    expect(optionValues).toContain('CNAS_DECLARATION')
    expect(optionValues).toContain('CASNOS')
    expect(optionValues).toContain('CACOBATPH')

    // Ensure non-fiscalite types are not present
    expect(optionValues).not.toContain('FACTURE_VENTE')
    expect(optionValues).not.toContain('BON_DE_LIVRAISON')
    expect(optionValues).not.toContain('CARTE_GRISE')
    expect(optionValues).not.toContain('FICHE_DE_PAIE')
    expect(optionValues).not.toContain('RELEVE_BANCAIRE')

    // 1 empty option + 9 fiscalite types = 10 options
    expect(optionValues).toHaveLength(10)
  })
})
