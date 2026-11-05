import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentUploadForm } from './document-upload-form'
import { toast } from 'sonner'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('DocumentUploadForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('filters document types by module', () => {
    render(<DocumentUploadForm module="CLIENTS" entityId="c1" onSuccess={jest.fn()} />)
    expect(screen.getByText('Facture de vente')).toBeInTheDocument()
    expect(screen.queryByText('G50')).not.toBeInTheDocument()
  })

  it("shows dueDate field as required for ASSURANCE type", async () => {
    render(<DocumentUploadForm module="MATERIEL" entityId="m1" onSuccess={jest.fn()} />)
    await userEvent.selectOptions(screen.getByLabelText(/type/i), 'ASSURANCE')
    expect(screen.getByLabelText(/date d'expiration/i)).toBeRequired()
  })

  it("shows dueDate field as required for CONTROLE_TECHNIQUE type", async () => {
    render(<DocumentUploadForm module="MATERIEL" entityId="m1" onSuccess={jest.fn()} />)
    await userEvent.selectOptions(screen.getByLabelText(/type/i), 'CONTROLE_TECHNIQUE')
    expect(screen.getByLabelText(/date d'expiration/i)).toBeRequired()
  })

  it('submits multipart form data to /api/documents and calls onSuccess on 201', async () => {
    const onSuccess = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'doc-123' }),
    })

    render(<DocumentUploadForm module="CLIENTS" entityId="client-1" onSuccess={onSuccess} />)

    const file = new File(['dummy-content'], 'facture.pdf', { type: 'application/pdf' })
    const fileInput = screen.getByLabelText(/fichier/i)
    await userEvent.upload(fileInput, file)

    await userEvent.type(screen.getByLabelText(/titre/i), 'Facture F-2026-001')
    await userEvent.selectOptions(screen.getByLabelText(/type/i), 'FACTURE_VENTE')
    await userEvent.type(screen.getByLabelText(/date d'émission/i), '2026-03-01')
    await userEvent.type(screen.getByLabelText(/montant/i), '45000')

    await userEvent.click(screen.getByRole('button', { name: /téléverser|enregistrer|ajouter/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/documents', expect.objectContaining({
        method: 'POST',
      }))
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalled()
    })
  })

  it('uploads directly to storage via presigned PUT when file size exceeds 3.5MB', async () => {
    const onSuccess = jest.fn()
    ;(global.fetch as jest.Mock)
      // 1. /api/documents/upload-url
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          uploadUrl: 'https://r2.cloudflarestorage.com/mock-upload-url',
          fileKey: 'CLIENTS/client-1/large-file.pdf',
        }),
      })
      // 2. Direct PUT to R2
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      // 3. /api/documents (metadata)
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'doc-large-123' }),
      })

    render(<DocumentUploadForm module="CLIENTS" entityId="client-1" onSuccess={onSuccess} />)

    const largeFile = new File(['mock content'], 'large.pdf', { type: 'application/pdf' })
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 }) // 6 MB

    await userEvent.upload(screen.getByLabelText(/fichier/i), largeFile)
    await userEvent.type(screen.getByLabelText(/titre/i), 'Grand Contrat')
    await userEvent.selectOptions(screen.getByLabelText(/type/i), 'CONTRAT_CLIENT')
    await userEvent.type(screen.getByLabelText(/date d'émission/i), '2026-03-01')

    await userEvent.click(screen.getByRole('button', { name: /téléverser|enregistrer|ajouter/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/documents/upload-url',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            filename: 'large.pdf',
            mimetype: 'application/pdf',
            module: 'CLIENTS',
            entityId: 'client-1',
          }),
        })
      )
      expect(global.fetch).toHaveBeenCalledWith(
        'https://r2.cloudflarestorage.com/mock-upload-url',
        expect.objectContaining({
          method: 'PUT',
          body: largeFile,
        })
      )
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/documents',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Document téléversé avec succès')
    })
  })

  it('shows error toast when server returns an error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Type de document non valide pour ce module' }),
    })

    render(<DocumentUploadForm module="CLIENTS" entityId="client-1" onSuccess={jest.fn()} />)

    const file = new File(['dummy-content'], 'facture.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText(/fichier/i), file)
    await userEvent.type(screen.getByLabelText(/titre/i), 'Facture Test')
    await userEvent.selectOptions(screen.getByLabelText(/type/i), 'FACTURE_VENTE')
    await userEvent.type(screen.getByLabelText(/date d'émission/i), '2026-03-01')

    await userEvent.click(screen.getByRole('button', { name: /téléverser|enregistrer|ajouter/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Type de document non valide pour ce module')
    })
  })
})
