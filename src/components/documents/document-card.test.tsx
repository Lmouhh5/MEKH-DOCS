import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentCard } from './document-card'
import { DocumentSummary } from '@/lib/types'

const sampleDoc: DocumentSummary = {
  id: 'doc-123',
  title: 'Facture Client SARL ABC',
  documentType: 'FACTURE_VENTE',
  module: 'CLIENTS',
  issueDate: '2026-03-01T00:00:00.000Z',
  dueDate: '2026-04-01T00:00:00.000Z',
  amount: 150000,
  isPaid: true,
  entityName: 'SARL ABC',
}

describe('DocumentCard', () => {
  it('renders document information and badges correctly', () => {
    render(<DocumentCard document={sampleDoc} />)

    expect(screen.getByText('Facture Client SARL ABC')).toBeInTheDocument()
    expect(screen.getByText('Facture de vente')).toBeInTheDocument()
    expect(screen.getByText('SARL ABC')).toBeInTheDocument()
    expect(screen.getByText('Payé')).toBeInTheDocument()
    expect(screen.getByText(/01\/03\/2026/)).toBeInTheDocument()
    expect(screen.getByText(/01\/04\/2026/)).toBeInTheDocument()
    expect(screen.getByText(/150\s?000.*DZD/i)).toBeInTheDocument()
  })

  it('renders "Impayé" badge when isPaid is false', () => {
    render(<DocumentCard document={{ ...sampleDoc, isPaid: false }} />)
    expect(screen.getByText('Impayé')).toBeInTheDocument()
  })

  it('triggers onSelect when clicked', async () => {
    const onSelect = jest.fn()
    render(<DocumentCard document={sampleDoc} onSelect={onSelect} />)

    const card = screen.getByRole('button')
    await userEvent.click(card)

    expect(onSelect).toHaveBeenCalledWith('doc-123')
  })

  it('triggers onSelect when Enter key is pressed', async () => {
    const onSelect = jest.fn()
    render(<DocumentCard document={sampleDoc} onSelect={onSelect} />)

    const card = screen.getByRole('button')
    card.focus()
    await userEvent.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith('doc-123')
  })
})
