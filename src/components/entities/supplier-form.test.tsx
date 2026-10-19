import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupplierForm } from './supplier-form'
import { toast } from 'sonner'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('SupplierForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders form fields with correct French labels', () => {
    render(<SupplierForm onSuccess={jest.fn()} />)

    expect(screen.getByLabelText(/Raison Sociale \/ Nom du Fournisseur/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/NIF \(Numéro d'Identification Fiscale\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Téléphone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Adresse/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enregistrer|créer/i })).toBeInTheDocument()
  })

  it('prevents submission and shows toast error when nom is empty', async () => {
    render(<SupplierForm onSuccess={jest.fn()} />)

    const submitBtn = screen.getByRole('button', { name: /enregistrer|créer/i })
    await userEvent.click(submitBtn)

    expect(global.fetch).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Le nom est requis')
  })

  it('submits POST /api/fournisseurs and calls onSuccess on successful creation', async () => {
    const onSuccess = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'fournisseur-1',
        nom: 'SARL Ciment & Béton',
        nif: '00192837465',
        telephone: '0555123456',
        adresse: 'Alger Centre',
      }),
    })

    render(<SupplierForm onSuccess={onSuccess} />)

    await userEvent.type(screen.getByLabelText(/Raison Sociale \/ Nom du Fournisseur/i), 'SARL Ciment & Béton')
    await userEvent.type(screen.getByLabelText(/NIF \(Numéro d'Identification Fiscale\)/i), '00192837465')
    await userEvent.type(screen.getByLabelText(/Téléphone/i), '0555123456')
    await userEvent.type(screen.getByLabelText(/Adresse/i), 'Alger Centre')

    const submitBtn = screen.getByRole('button', { name: /enregistrer|créer/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/fournisseurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: 'SARL Ciment & Béton',
          nif: '00192837465',
          telephone: '0555123456',
          adresse: 'Alger Centre',
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Fournisseur créé avec succès')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('pre-fills data and submits PATCH /api/fournisseurs/[id] in edit mode', async () => {
    const onSuccess = jest.fn()
    const initialSupplier = {
      id: 'fournisseur-42',
      nom: 'Fournisseur Existant',
      nif: '99887766',
      telephone: '021000000',
      adresse: 'Bab Ezzouar',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ...initialSupplier,
        nom: 'Fournisseur Modifié',
      }),
    })

    render(<SupplierForm supplier={initialSupplier} onSuccess={onSuccess} />)

    const nomInput = screen.getByLabelText(/Raison Sociale \/ Nom du Fournisseur/i)
    expect(nomInput).toHaveValue('Fournisseur Existant')
    expect(screen.getByLabelText(/NIF \(Numéro d'Identification Fiscale\)/i)).toHaveValue('99887766')
    expect(screen.getByLabelText(/Téléphone/i)).toHaveValue('021000000')
    expect(screen.getByLabelText(/Adresse/i)).toHaveValue('Bab Ezzouar')

    await userEvent.clear(nomInput)
    await userEvent.type(nomInput, 'Fournisseur Modifié')

    const submitBtn = screen.getByRole('button', { name: /enregistrer|modifier/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/fournisseurs/fournisseur-42', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: 'Fournisseur Modifié',
          nif: '99887766',
          telephone: '021000000',
          adresse: 'Bab Ezzouar',
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Fournisseur modifié avec succès')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('sends null when optional fields are cleared in edit mode', async () => {
    const onSuccess = jest.fn()
    const initialSupplier = {
      id: 'fournisseur-42',
      nom: 'Fournisseur Test',
      nif: '12345678',
      telephone: '0550112233',
      adresse: 'Alger',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'fournisseur-42',
        nom: 'Fournisseur Test',
        nif: null,
        telephone: null,
        adresse: null,
      }),
    })

    render(<SupplierForm supplier={initialSupplier} onSuccess={onSuccess} />)

    const nifInput = screen.getByLabelText(/NIF \(Numéro d'Identification Fiscale\)/i)
    const telInput = screen.getByLabelText(/Téléphone/i)
    const adrInput = screen.getByLabelText(/Adresse/i)

    await userEvent.clear(nifInput)
    await userEvent.clear(telInput)
    await userEvent.clear(adrInput)

    const submitBtn = screen.getByRole('button', { name: /enregistrer|modifier/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/fournisseurs/fournisseur-42', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: 'Fournisseur Test',
          nif: null,
          telephone: null,
          adresse: null,
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Fournisseur modifié avec succès')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('handles API error responses and displays error toast', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Erreur de validation serveur' }),
    })

    render(<SupplierForm onSuccess={jest.fn()} />)

    await userEvent.type(screen.getByLabelText(/Raison Sociale \/ Nom du Fournisseur/i), 'Fournisseur Test')
    const submitBtn = screen.getByRole('button', { name: /enregistrer|créer/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erreur de validation serveur')
    })
  })
})
