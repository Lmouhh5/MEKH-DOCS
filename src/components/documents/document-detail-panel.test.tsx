import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { DocumentDetailPanel } from './document-detail-panel'

const mockDoc = {
  id: 'doc-123',
  title: 'Facture Equipement 2026',
  documentType: 'FACTURE_VENTE',
  module: 'CLIENTS',
  issueDate: '2026-03-01T00:00:00.000Z',
  dueDate: '2026-04-01T00:00:00.000Z',
  amount: 250000,
  isPaid: false,
  physicalLocation: 'Armoire A - Rayon 2',
  notes: 'Paiement à 30 jours fin de mois',
  signedUrl: 'http://minio/signed/doc-123.pdf',
  client: { id: 'client-1', nom: 'Entreprise ABC' },
}

describe('DocumentDetailPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('fetches and displays document metadata when opened', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockDoc,
    })

    render(
      <DocumentDetailPanel
        documentId="doc-123"
        isOpen={true}
        onClose={jest.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Facture Equipement 2026')).toBeInTheDocument()
      expect(screen.getByText('Facture de vente')).toBeInTheDocument()
      expect(screen.getByText('Entreprise ABC')).toBeInTheDocument()
      expect(screen.getByText('Armoire A - Rayon 2')).toBeInTheDocument()
      expect(screen.getByText('Paiement à 30 jours fin de mois')).toBeInTheDocument()
    })

    // Check PDF viewer iframe
    expect(screen.getByTitle(/aperçu du document pdf/i)).toHaveAttribute(
      'src',
      'http://minio/signed/doc-123.pdf'
    )

    // Check PaidToggle
    expect(screen.getByText('Impayé')).toBeInTheDocument()

    // Check DocumentLinkWidget placeholder
    expect(screen.getByTestId('document-link-widget-placeholder')).toBeInTheDocument()
  })

  it('renders error message when document fails to fetch', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Document non trouvé' }),
    })

    render(
      <DocumentDetailPanel
        documentId="doc-999"
        isOpen={true}
        onClose={jest.fn()}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByText(/erreur lors du chargement des détails du document/i)
      ).toBeInTheDocument()
    })
  })

  it('renders PaidToggle for FACTURE_ACHAT documents from FOURNISSEURS', async () => {
    const mockSupplierInvoice = {
      id: 'doc-456',
      title: 'Facture Fournisseur Ciment',
      documentType: 'FACTURE_ACHAT',
      module: 'FOURNISSEURS',
      issueDate: '2026-03-10T00:00:00.000Z',
      amount: 120000,
      isPaid: false,
      fournisseur: { id: 'fournisseur-1', nom: 'Lafarge Algérie' },
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockSupplierInvoice,
    })

    render(
      <DocumentDetailPanel
        documentId="doc-456"
        isOpen={true}
        onClose={jest.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Facture Fournisseur Ciment')).toBeInTheDocument()
      expect(screen.getByText("Facture d'achat")).toBeInTheDocument()
      expect(screen.getByText('Lafarge Algérie')).toBeInTheDocument()
      expect(screen.getByText('Impayé')).toBeInTheDocument()
    })
  })
})

