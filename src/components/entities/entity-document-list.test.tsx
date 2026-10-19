import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntityDocumentList } from './entity-document-list'
import { DocumentSummary } from '@/lib/types'

jest.mock('@/components/documents/document-detail-panel', () => ({
  DocumentDetailPanel: ({ documentId, onClose }: { documentId: string | null; onClose: () => void }) => {
    if (!documentId) return null
    return (
      <div data-testid="detail-panel">
        <span>Detail for {documentId}</span>
        <button onClick={onClose}>Fermer</button>
      </div>
    )
  },
}))

const mockDocs: DocumentSummary[] = [
  {
    id: 'doc-101',
    title: 'Facture Janvier',
    documentType: 'FACTURE_VENTE',
    module: 'CLIENTS',
    issueDate: '2026-01-15T00:00:00.000Z',
    amount: 15000,
    isPaid: true,
  },
  {
    id: 'doc-102',
    title: 'Bon de livraison #42',
    documentType: 'BON_DE_LIVRAISON',
    module: 'CLIENTS',
    issueDate: '2026-02-10T00:00:00.000Z',
    isPaid: false,
  },
]

describe('EntityDocumentList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders initial documents and upload link button', () => {
    render(
      <EntityDocumentList
        module="CLIENTS"
        entityId="client-1"
        initialDocuments={mockDocs}
      />
    )

    expect(screen.getByText('Facture Janvier')).toBeInTheDocument()
    expect(screen.getByText('Bon de livraison #42')).toBeInTheDocument()

    const uploadLink = screen.getByRole('link', { name: /nouveau document|ajouter/i })
    expect(uploadLink).toBeInTheDocument()
    expect(uploadLink).toHaveAttribute('href', '/clients/client-1/nouveau-document')
  })

  it('opens DocumentDetailPanel when a document card is clicked', async () => {
    render(
      <EntityDocumentList
        module="CLIENTS"
        entityId="client-1"
        initialDocuments={mockDocs}
      />
    )

    expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument()

    const card = screen.getByText('Facture Janvier')
    await userEvent.click(card)

    expect(screen.getByTestId('detail-panel')).toBeInTheDocument()
    expect(screen.getByText('Detail for doc-101')).toBeInTheDocument()

    // Close panel
    await userEvent.click(screen.getByRole('button', { name: /fermer/i }))
    expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument()
  })

  it('fetches documents if initialDocuments is not provided', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocs,
    })

    render(<EntityDocumentList module="CLIENTS" entityId="client-1" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('clientId=client-1')
      )
      expect(screen.getByText('Facture Janvier')).toBeInTheDocument()
    })
  })
})
