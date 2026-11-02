import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateClusterDialog } from './create-cluster-dialog'
import { UploadArchiveDialog } from './upload-archive-dialog'
import { MoveDocumentDialog } from './move-document-dialog'
import { DeleteClusterDialog } from './delete-cluster-dialog'
import { toast } from 'sonner'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Archive Dialogs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  describe('CreateClusterDialog', () => {
    it('renders CreateClusterDialog and submits cluster name via onSubmit prop', () => {
      const onSubmit = jest.fn()
      render(<CreateClusterDialog open={true} onOpenChange={jest.fn()} onSubmit={onSubmit} />)

      expect(screen.getByRole('heading', { name: /Nouveau Dossier/i })).toBeInTheDocument()

      fireEvent.change(screen.getByLabelText(/Nom du dossier/i), { target: { value: 'Marchés 2026' } })
      fireEvent.click(screen.getByRole('button', { name: /Créer le dossier/i }))

      expect(onSubmit).toHaveBeenCalledWith({ name: 'Marchés 2026', description: '' })
    })

    it('renders "Nouveau Sous-Dossier" when parentId is provided', () => {
      render(
        <CreateClusterDialog
          open={true}
          onOpenChange={jest.fn()}
          parentId="parent-1"
          parentName="Dossier Parent"
        />
      )

      expect(screen.getByRole('heading', { name: /Nouveau Sous-Dossier/i })).toBeInTheDocument()
      expect(screen.getByText(/Dossier Parent/i)).toBeInTheDocument()
    })

    it('submits via POST /api/archive/clusters when onSubmit is not provided', async () => {
      const onSuccess = jest.fn()
      const onOpenChange = jest.fn()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'new-cluster-1', name: 'Contrats RH', parentId: null }),
      })

      render(
        <CreateClusterDialog
          open={true}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      )

      fireEvent.change(screen.getByLabelText(/Nom du dossier/i), { target: { value: 'Contrats RH' } })
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Dossier des contrats' } })
      fireEvent.click(screen.getByRole('button', { name: /Créer le dossier/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/archive/clusters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Contrats RH',
            description: 'Dossier des contrats',
            parentId: null,
          }),
        })
        expect(toast.success).toHaveBeenCalledWith('Dossier créé avec succès')
        expect(onSuccess).toHaveBeenCalled()
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('displays error toast when creation fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Le nom ne peut pas dépasser 100 caractères' }),
      })

      render(<CreateClusterDialog open={true} onOpenChange={jest.fn()} />)

      fireEvent.change(screen.getByLabelText(/Nom du dossier/i), { target: { value: 'Trop long' } })
      fireEvent.click(screen.getByRole('button', { name: /Créer le dossier/i }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Le nom ne peut pas dépasser 100 caractères')
      })
    })

    it('shows toast error when folder name is empty', () => {
      render(<CreateClusterDialog open={true} onOpenChange={jest.fn()} />)
      fireEvent.click(screen.getByRole('button', { name: /Créer le dossier/i }))
      expect(toast.error).toHaveBeenCalledWith('Le nom du dossier est requis')
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('UploadArchiveDialog', () => {
    it('renders form inputs and uploads PDF document to /api/archive/documents', async () => {
      const onSuccess = jest.fn()
      const onOpenChange = jest.fn()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'doc-1', title: 'Facture 2026-001' }),
      })

      render(
        <UploadArchiveDialog
          open={true}
          onOpenChange={onOpenChange}
          clusterId="cluster-1"
          clusterName="Marchés Publics"
          onSuccess={onSuccess}
        />
      )

      expect(screen.getByRole('heading', { name: /Téléverser un document/i })).toBeInTheDocument()

      const file = new File(['%PDF-1.4 test'], 'facture.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/Fichier/i)
      await userEvent.upload(fileInput, file)

      fireEvent.change(screen.getByLabelText(/Titre du document/i), {
        target: { value: 'Facture 2026-001' },
      })
      fireEvent.change(screen.getByLabelText(/Date d'émission/i), {
        target: { value: '2026-04-15' },
      })
      fireEvent.change(screen.getByLabelText(/Date d'échéance/i), {
        target: { value: '2026-05-15' },
      })
      fireEvent.change(screen.getByLabelText(/Montant/i), {
        target: { value: '150000' },
      })
      fireEvent.change(screen.getByLabelText(/Emplacement physique/i), {
        target: { value: 'Armoire B, Rayon 2' },
      })
      fireEvent.change(screen.getByLabelText(/Notes/i), {
        target: { value: 'Appel d’offre n°42' },
      })

      fireEvent.click(screen.getByRole('button', { name: /Téléverser/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/archive/documents',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        )
      })

      const call = (global.fetch as jest.Mock).mock.calls[0]
      const formData = call[1].body as FormData
      expect(formData.get('title')).toBe('Facture 2026-001')
      expect(formData.get('archiveClusterId')).toBe('cluster-1')
      expect(formData.get('issueDate')).toBe('2026-04-15')
      expect(formData.get('dueDate')).toBe('2026-05-15')
      expect(formData.get('amount')).toBe('150000')
      expect(formData.get('physicalLocation')).toBe('Armoire B, Rayon 2')
      expect(formData.get('notes')).toBe('Appel d’offre n°42')
      expect((formData.get('file') as File).name).toBe('facture.pdf')

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Document téléversé avec succès')
        expect(onSuccess).toHaveBeenCalled()
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('rejects non-PDF files with toast error', async () => {
      render(
        <UploadArchiveDialog
          open={true}
          onOpenChange={jest.fn()}
          clusterId="cluster-1"
        />
      )

      const file = new File(['hello'], 'document.docx', { type: 'application/msword' })
      const fileInput = screen.getByLabelText(/Fichier/i)
      fireEvent.change(fileInput, { target: { files: [file] } })

      expect(toast.error).toHaveBeenCalledWith('Seuls les fichiers PDF sont acceptés')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('displays server error toast when upload request fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Dossier d’archive non trouvé' }),
      })

      render(
        <UploadArchiveDialog
          open={true}
          onOpenChange={jest.fn()}
          clusterId="cluster-invalid"
        />
      )

      const file = new File(['%PDF-1.4'], 'facture.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/Fichier/i)
      await userEvent.upload(fileInput, file)

      fireEvent.change(screen.getByLabelText(/Titre du document/i), {
        target: { value: 'Facture' },
      })
      fireEvent.change(screen.getByLabelText(/Date d'émission/i), {
        target: { value: '2026-04-15' },
      })

      fireEvent.click(screen.getByRole('button', { name: /Téléverser/i }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Dossier d’archive non trouvé')
      })
    })

    it('shows toast error when submitting without file', () => {
      render(
        <UploadArchiveDialog
          open={true}
          onOpenChange={jest.fn()}
          clusterId="cluster-1"
        />
      )

      fireEvent.change(screen.getByLabelText(/Titre du document/i), {
        target: { value: 'Document sans fichier' },
      })
      fireEvent.click(screen.getByRole('button', { name: /Téléverser/i }))

      expect(toast.error).toHaveBeenCalledWith('Veuillez sélectionner un fichier PDF')
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('MoveDocumentDialog', () => {
    const mockTree = [
      {
        id: 'cluster-current',
        name: 'Dossier Actuel',
        children: [
          {
            id: 'cluster-sub-1',
            name: 'Sous-dossier 1',
            children: [],
          },
        ],
      },
      {
        id: 'cluster-dest',
        name: 'Dossier Destination',
        children: [
          {
            id: 'cluster-dest-sub',
            name: 'Sous-dossier Dest',
            children: [],
          },
        ],
      },
    ]

    it('renders MoveDocumentDialog with cluster selection options and moves document', async () => {
      const onSuccess = jest.fn()
      const onOpenChange = jest.fn()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTree,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 'doc-123', archiveClusterId: 'cluster-dest' }),
        })

      render(
        <MoveDocumentDialog
          open={true}
          onOpenChange={onOpenChange}
          documentId="doc-123"
          documentTitle="Facture Sonelgaz"
          currentClusterId="cluster-current"
          onSuccess={onSuccess}
        />
      )

      expect(screen.getByRole('heading', { name: /Déplacer le document/i })).toBeInTheDocument()
      expect(screen.getByText(/Facture Sonelgaz/i)).toBeInTheDocument()

      // Should fetch cluster tree
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/archive/clusters?tree=true')
      })

      // Destination clusters should appear
      await waitFor(() => {
        expect(screen.getByText('Dossier Destination')).toBeInTheDocument()
      })

      // Select target cluster
      const destOption = screen.getByLabelText(/Dossier Destination/i)
      fireEvent.click(destOption)

      // Submit move
      fireEvent.click(screen.getByRole('button', { name: /Déplacer/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/archive/documents/doc-123/move',
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetClusterId: 'cluster-dest' }),
          }
        )
        expect(toast.success).toHaveBeenCalledWith('Document déplacé avec succès')
        expect(onSuccess).toHaveBeenCalled()
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('disables or does not allow selecting the current cluster', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTree,
      })

      render(
        <MoveDocumentDialog
          open={true}
          onOpenChange={jest.fn()}
          documentId="doc-123"
          documentTitle="Facture Sonelgaz"
          currentClusterId="cluster-current"
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Dossier Actuel/i)).toBeInTheDocument()
      })

      const currentRadio = screen.getByLabelText(/Dossier Actuel/i) as HTMLInputElement
      expect(currentRadio.disabled).toBe(true)
    })

    it('keeps submit button disabled when no target cluster is selected', () => {
      render(
        <MoveDocumentDialog
          open={true}
          onOpenChange={jest.fn()}
          documentId="doc-123"
          documentTitle="Facture Sonelgaz"
          currentClusterId="cluster-current"
          clusters={mockTree}
        />
      )

      expect(screen.getByRole('button', { name: /Déplacer/i })).toBeDisabled()
    })
  })

  describe('DeleteClusterDialog', () => {
    it('renders warning message about non-empty folders and deletes cluster on confirm', async () => {
      const onSuccess = jest.fn()
      const onOpenChange = jest.fn()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      render(
        <DeleteClusterDialog
          open={true}
          onOpenChange={onOpenChange}
          clusterId="cluster-to-delete"
          clusterName="Dossier Obsolète"
          onSuccess={onSuccess}
        />
      )

      expect(screen.getByRole('heading', { name: /Supprimer le dossier/i })).toBeInTheDocument()
      expect(screen.getByText(/Dossier Obsolète/i)).toBeInTheDocument()
      expect(
        screen.getByText(/la suppression échouera si le dossier contient encore des documents ou sous-dossiers/i)
      ).toBeInTheDocument()

      const deleteBtn = screen.getByRole('button', { name: /Supprimer le dossier/i })
      fireEvent.click(deleteBtn)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/archive/clusters/cluster-to-delete', {
          method: 'DELETE',
        })
        expect(toast.success).toHaveBeenCalledWith('Dossier supprimé avec succès')
        expect(onSuccess).toHaveBeenCalled()
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('handles 400 error when cluster is not empty and displays server error message', async () => {
      const serverError =
        "Impossible de supprimer ce dossier : il contient encore des documents ou sous-dossiers. Veuillez d'abord les vider ou les déplacer."

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: serverError }),
      })

      render(
        <DeleteClusterDialog
          open={true}
          onOpenChange={jest.fn()}
          clusterId="cluster-not-empty"
          clusterName="Dossier Plein"
        />
      )

      const deleteBtn = screen.getByRole('button', { name: /Supprimer le dossier/i })
      fireEvent.click(deleteBtn)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(serverError)
      })
    })

    it('handles network error gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(
        <DeleteClusterDialog
          open={true}
          onOpenChange={jest.fn()}
          clusterId="c-fail"
          clusterName="Fail"
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Supprimer le dossier/i }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Erreur réseau lors de la suppression du dossier')
      })
    })
  })
})
