import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientForm } from './client-form'
import { toast } from 'sonner'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('ClientForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders form fields with correct French labels', () => {
    render(<ClientForm onSuccess={jest.fn()} />)

    expect(screen.getByLabelText(/Raison Sociale \/ Nom/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/NIF \(Numéro d'Identification Fiscale\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Téléphone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Adresse/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enregistrer|créer/i })).toBeInTheDocument()
  })

  it('prevents submission and shows toast error when nom is empty', async () => {
    render(<ClientForm onSuccess={jest.fn()} />)

    const submitBtn = screen.getByRole('button', { name: /enregistrer|créer/i })
    await userEvent.click(submitBtn)

    expect(global.fetch).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Le nom est requis')
  })

  it('submits POST /api/clients and calls onSuccess on successful creation', async () => {
    const onSuccess = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'client-1',
        nom: 'SARL Alpha',
        nif: '00192837465',
        telephone: '0555123456',
        adresse: 'Alger Centre',
      }),
    })

    render(<ClientForm onSuccess={onSuccess} />)

    await userEvent.type(screen.getByLabelText(/Raison Sociale \/ Nom/i), 'SARL Alpha')
    await userEvent.type(screen.getByLabelText(/NIF \(Numéro d'Identification Fiscale\)/i), '00192837465')
    await userEvent.type(screen.getByLabelText(/Téléphone/i), '0555123456')
    await userEvent.type(screen.getByLabelText(/Adresse/i), 'Alger Centre')

    const submitBtn = screen.getByRole('button', { name: /enregistrer|créer/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: 'SARL Alpha',
          nif: '00192837465',
          telephone: '0555123456',
          adresse: 'Alger Centre',
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Client créé avec succès')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('pre-fills data and submits PATCH /api/clients/[id] in edit mode', async () => {
    const onSuccess = jest.fn()
    const initialClient = {
      id: 'client-42',
      nom: 'Entreprise Existante',
      nif: '99887766',
      telephone: '021000000',
      adresse: 'Bab Ezzouar',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ...initialClient,
        nom: 'Entreprise Modifiée',
      }),
    })

    render(<ClientForm client={initialClient} onSuccess={onSuccess} />)

    const nomInput = screen.getByLabelText(/Raison Sociale \/ Nom/i)
    expect(nomInput).toHaveValue('Entreprise Existante')
    expect(screen.getByLabelText(/NIF \(Numéro d'Identification Fiscale\)/i)).toHaveValue('99887766')
    expect(screen.getByLabelText(/Téléphone/i)).toHaveValue('021000000')
    expect(screen.getByLabelText(/Adresse/i)).toHaveValue('Bab Ezzouar')

    await userEvent.clear(nomInput)
    await userEvent.type(nomInput, 'Entreprise Modifiée')

    const submitBtn = screen.getByRole('button', { name: /enregistrer|modifier/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/clients/client-42', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: 'Entreprise Modifiée',
          nif: '99887766',
          telephone: '021000000',
          adresse: 'Bab Ezzouar',
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Client modifié avec succès')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('handles API error responses and displays error toast', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Erreur de validation serveur' }),
    })

    render(<ClientForm onSuccess={jest.fn()} />)

    await userEvent.type(screen.getByLabelText(/Raison Sociale \/ Nom/i), 'SARL Test')
    const submitBtn = screen.getByRole('button', { name: /enregistrer|créer/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erreur de validation serveur')
    })
  })
})
