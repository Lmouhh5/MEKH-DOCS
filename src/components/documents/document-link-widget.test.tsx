import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { DocumentLinkWidget } from './document-link-widget'
import { toast } from 'sonner'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockLinkedDocs = [
  {
    id: 'doc-linked-1',
    title: 'Bon de Commande #101',
    documentType: 'BON_DE_COMMANDE',
    module: 'FOURNISSEURS',
    issueDate: '2026-03-01T00:00:00.000Z',
    entityName: 'Fournisseur Alpha',
  },
  {
    id: 'doc-linked-2',
    title: 'Facture Fournisseur #202',
    documentType: 'FACTURE_ACHAT',
    module: 'FOURNISSEURS',
    issueDate: '2026-03-15T00:00:00.000Z',
    entityName: 'Fournisseur Alpha',
  },
]

describe('DocumentLinkWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders widget title and empty state when no links exist', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    render(<DocumentLinkWidget documentId="doc-current" />)

    expect(screen.getByText('Documents Liés & Chaîne Documentaire')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /lier un document/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/aucun document lié/i)).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc-current/links')
  })

  it('fetches and displays existing linked documents with Type, Title, Entity, Date, and Délier button', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLinkedDocs,
    })

    render(<DocumentLinkWidget documentId="doc-current" />)

    await waitFor(() => {
      expect(screen.getByText('Bon de Commande #101')).toBeInTheDocument()
      expect(screen.getByText('Facture Fournisseur #202')).toBeInTheDocument()
    })

    expect(screen.getAllByText('Fournisseur Alpha')).toHaveLength(2)
    expect(screen.getByText('Bon de commande')).toBeInTheDocument()
    expect(screen.getByText("Facture d'achat")).toBeInTheDocument()

    const unbindButtons = screen.getAllByRole('button', { name: /délier/i })
    expect(unbindButtons).toHaveLength(2)
  })

  it('calls onSelectLinkedDocument when a linked document is clicked', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLinkedDocs,
    })

    const onSelectMock = jest.fn()
    render(
      <DocumentLinkWidget
        documentId="doc-current"
        onSelectLinkedDocument={onSelectMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Bon de Commande #101')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Bon de Commande #101'))
    expect(onSelectMock).toHaveBeenCalledWith('doc-linked-1')
  })

  it('calls DELETE /api/documents/[id]/links when clicking Délier and removes item', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockLinkedDocs[0]],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

    render(<DocumentLinkWidget documentId="doc-current" />)

    await waitFor(() => {
      expect(screen.getByText('Bon de Commande #101')).toBeInTheDocument()
    })

    const unbindBtn = screen.getByRole('button', { name: /délier/i })
    fireEvent.click(unbindBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/documents/doc-current/links'),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
      expect(screen.queryByText('Bon de Commande #101')).not.toBeInTheDocument()
      expect(screen.getByText(/aucun document lié/i)).toBeInTheDocument()
    })
  })

  it('opens search dialog, searches candidates, filters out current & linked docs, and links candidate', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockLinkedDocs[0]], // doc-linked-1 is already linked
    })

    render(<DocumentLinkWidget documentId="doc-current" />)

    await waitFor(() => {
      expect(screen.getByText('Bon de Commande #101')).toBeInTheDocument()
    })

    // Click "Lier un document"
    const openDialogBtn = screen.getByRole('button', { name: /lier un document/i })
    fireEvent.click(openDialogBtn)

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher/i)).toBeInTheDocument()
    })

    // Search results returning doc-current (to be filtered out), doc-linked-1 (already linked, to be filtered), and doc-new (valid candidate)
    const searchResults = [
      {
        id: 'doc-current',
        title: 'Document Actuel',
        documentType: 'DEVIS',
        module: 'CLIENTS',
        issueDate: '2026-03-01T00:00:00.000Z',
        entityName: 'Client Beta',
      },
      {
        id: 'doc-linked-1',
        title: 'Bon de Commande #101',
        documentType: 'BON_COMMANDE',
        module: 'FOURNISSEURS',
        issueDate: '2026-03-01T00:00:00.000Z',
        entityName: 'Fournisseur Alpha',
      },
      {
        id: 'doc-new',
        title: 'Bon de Livraison #303',
        documentType: 'BON_LIVRAISON',
        module: 'FOURNISSEURS',
        issueDate: '2026-03-10T00:00:00.000Z',
        entityName: 'Fournisseur Alpha',
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => searchResults,
    })

    const searchInput = screen.getByPlaceholderText(/rechercher/i)
    fireEvent.change(searchInput, { target: { value: 'Livraison' } })

    // Only doc-new should be shown as candidate
    await waitFor(() => {
      expect(screen.getByText('Bon de Livraison #303')).toBeInTheDocument()
      expect(screen.queryByText('Document Actuel')).not.toBeInTheDocument()
    })

    // Mock POST /api/documents/doc-current/links
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ success: true }),
    })

    // Click "Lier" on the candidate
    const linkCandidateBtn = screen.getByRole('button', { name: /^lier$/i })
    fireEvent.click(linkCandidateBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/documents/doc-current/links',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ targetId: 'doc-new' }),
        })
      )
      expect(toast.success).toHaveBeenCalledWith('Document lié avec succès')
      expect(screen.getByText('Bon de Livraison #303')).toBeInTheDocument()
    })
  })
})
