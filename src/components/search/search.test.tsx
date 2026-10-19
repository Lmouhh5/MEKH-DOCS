import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { SearchBar } from './search-bar'
import { SearchFilters } from './search-filters'
import { SearchResults } from './search-results'
import RecherchePage from '@/app/(app)/recherche/page'

const mockPush = jest.fn()
const mockReplace = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/recherche',
}))

// Mock DocumentDetailPanel
jest.mock('@/components/documents/document-detail-panel', () => ({
  DocumentDetailPanel: ({ documentId, onClose }: { documentId: string | null; onClose: () => void }) => {
    if (!documentId) return null
    return (
      <div data-testid="mock-detail-panel">
        <span>Detail for {documentId}</span>
        <button onClick={onClose}>Fermer</button>
      </div>
    )
  },
}))

describe('SearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockSearchParams = new URLSearchParams()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders input with placeholder and search icon', () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText(/rechercher/i)
    expect(input).toBeInTheDocument()
  })

  it('debounces input changes by 300ms before calling router.replace', async () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText(/rechercher/i)

    fireEvent.change(input, { target: { value: 'facture 2026' } })

    // Immediately, router.replace shouldn't have been called
    expect(mockReplace).not.toHaveBeenCalled()

    // Fast-forward 200ms -> still not called
    act(() => {
      jest.advanceTimersByTime(200)
    })
    expect(mockReplace).not.toHaveBeenCalled()

    // Fast-forward another 150ms (total 350ms) -> should be called
    act(() => {
      jest.advanceTimersByTime(150)
    })
    expect(mockReplace).toHaveBeenCalledWith('/recherche?entity=facture+2026')
  })

  it('removes entity query param when input is cleared', async () => {
    mockSearchParams = new URLSearchParams('entity=existing&type=G50')
    render(<SearchBar />)
    const input = screen.getByPlaceholderText(/rechercher/i)

    fireEvent.change(input, { target: { value: '' } })
    act(() => {
      jest.advanceTimersByTime(350)
    })

    expect(mockReplace).toHaveBeenCalledWith('/recherche?type=G50')
  })
})

describe('SearchFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = new URLSearchParams()
  })

  it('renders document type select, date inputs, module select, and reset button', () => {
    render(<SearchFilters />)
    expect(screen.getByLabelText(/type de document/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^du$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^au$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/module/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /réinitialiser/i })).toBeInTheDocument()
  })

  it('updates type query param when document type changes', async () => {
    render(<SearchFilters />)
    const typeSelect = screen.getByLabelText(/type de document/i)

    fireEvent.change(typeSelect, { target: { value: 'FACTURE_VENTE' } })

    expect(mockReplace).toHaveBeenCalledWith('/recherche?type=FACTURE_VENTE')
  })

  it('updates from and to query params when dates change', async () => {
    const { rerender } = render(<SearchFilters />)
    const fromInput = screen.getByLabelText(/^du$/i)

    fireEvent.change(fromInput, { target: { value: '2026-01-01' } })
    expect(mockReplace).toHaveBeenCalledWith('/recherche?from=2026-01-01')

    mockSearchParams = new URLSearchParams('from=2026-01-01')
    rerender(<SearchFilters />)
    const toInput = screen.getByLabelText(/^au$/i)
    fireEvent.change(toInput, { target: { value: '2026-03-31' } })
    expect(mockReplace).toHaveBeenCalledWith('/recherche?from=2026-01-01&to=2026-03-31')
  })

  it('resets all filters when clicking reset button', async () => {
    mockSearchParams = new URLSearchParams('entity=test&type=G50&from=2026-01-01&to=2026-03-31&module=FISCALITE')
    render(<SearchFilters />)

    const resetButton = screen.getByRole('button', { name: /réinitialiser/i })
    fireEvent.click(resetButton)

    expect(mockReplace).toHaveBeenCalledWith('/recherche')
  })
})

describe('SearchResults', () => {
  const mockDocs = [
    {
      id: 'doc-1',
      title: 'Facture Equipement 2026',
      documentType: 'FACTURE_VENTE',
      module: 'CLIENTS',
      issueDate: '2026-03-01T00:00:00.000Z',
      amount: 45000,
      entityName: 'Client Alpha',
    },
    {
      id: 'doc-2',
      title: 'Assurance Machine CAT',
      documentType: 'ASSURANCE',
      module: 'MATERIEL',
      issueDate: '2026-02-15T00:00:00.000Z',
      entityName: 'ENG-01',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = new URLSearchParams('entity=facture')
    global.fetch = jest.fn()
  })

  it('shows loading skeleton while fetching', async () => {
    ;(global.fetch as jest.Mock).mockReturnValue(new Promise(() => {})) // never resolves
    render(<SearchResults />)

    expect(screen.getByTestId('search-loading-skeleton')).toBeInTheDocument()
  })

  it('shows empty message when no documents match', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [],
    })

    render(<SearchResults />)

    await waitFor(() => {
      expect(
        screen.getByText('Aucun document trouvé correspondant à vos critères de recherche')
      ).toBeInTheDocument()
    })
  })

  it('renders document count and list when documents are found', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockDocs,
    })

    render(<SearchResults />)

    await waitFor(() => {
      expect(screen.getByText(/2 documents trouvés/i)).toBeInTheDocument()
      expect(screen.getByText('Facture Equipement 2026')).toBeInTheDocument()
      expect(screen.getByText('Assurance Machine CAT')).toBeInTheDocument()
    })
  })

  it('opens DocumentDetailPanel when a card is clicked', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockDocs,
    })

    render(<SearchResults />)

    await waitFor(() => {
      expect(screen.getByText('Facture Equipement 2026')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Facture Equipement 2026'))

    await waitFor(() => {
      expect(screen.getByTestId('mock-detail-panel')).toBeInTheDocument()
      expect(screen.getByText('Detail for doc-1')).toBeInTheDocument()
    })

    // Close panel
    fireEvent.click(screen.getByText('Fermer'))
    await waitFor(() => {
      expect(screen.queryByTestId('mock-detail-panel')).not.toBeInTheDocument()
    })
  })
})

describe('RecherchePage', () => {
  it('renders page title and components inside Suspense boundary', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [],
    })

    render(<RecherchePage />)
    expect(screen.getByRole('heading', { name: /recherche de documents/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/rechercher/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/type de document/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(
        screen.getByText('Aucun document trouvé correspondant à vos critères de recherche')
      ).toBeInTheDocument()
    })
  })
})
