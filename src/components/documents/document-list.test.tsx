import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentList } from './document-list'
import { DocumentSummary } from '@/lib/types'

const docs: DocumentSummary[] = [
  {
    id: 'doc-1',
    title: 'Facture Client 1',
    documentType: 'FACTURE_VENTE',
    module: 'CLIENTS',
    issueDate: '2026-03-01T00:00:00.000Z',
    amount: 50000,
    isPaid: true,
  },
  {
    id: 'doc-2',
    title: 'Bon de livraison 2',
    documentType: 'BON_DE_LIVRAISON',
    module: 'CLIENTS',
    issueDate: '2026-03-02T00:00:00.000Z',
  },
]

describe('DocumentList', () => {
  it('renders "Aucun document trouvé" when list is empty', () => {
    render(<DocumentList documents={[]} />)
    expect(screen.getByText('Aucun document trouvé')).toBeInTheDocument()
  })

  it('renders multiple document cards when documents are provided', () => {
    render(<DocumentList documents={docs} />)
    expect(screen.getByText('Facture Client 1')).toBeInTheDocument()
    expect(screen.getByText('Bon de livraison 2')).toBeInTheDocument()
  })

  it('calls onSelect when a card is clicked', async () => {
    const onSelect = jest.fn()
    render(<DocumentList documents={docs} onSelect={onSelect} />)

    const cards = screen.getAllByRole('button')
    await userEvent.click(cards[0])

    expect(onSelect).toHaveBeenCalledWith('doc-1')
  })
})
