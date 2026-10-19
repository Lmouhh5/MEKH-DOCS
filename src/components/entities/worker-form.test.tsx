import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkerForm } from './worker-form'
import { toast } from 'sonner'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('WorkerForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders form fields with correct French labels', () => {
    render(<WorkerForm onSuccess={jest.fn()} />)

    expect(screen.getByLabelText(/Nom et Prénom de l'Employé/i)).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Numéro d'Identification \(CIN \/ Matricule\)/i)
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Numéro CNAS/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Date de Début de Contrat/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /créer|enregistrer/i })).toBeInTheDocument()
  })

  it('prevents submission and shows toast error when nom is empty', async () => {
    render(<WorkerForm onSuccess={jest.fn()} />)

    const submitBtn = screen.getByRole('button', { name: /créer|enregistrer/i })
    await userEvent.click(submitBtn)

    expect(global.fetch).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Le nom est requis')
  })

  it('submits POST /api/personnel and calls onSuccess on successful creation', async () => {
    const onSuccess = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'worker-1',
        nom: 'Ali Larbi',
        numeroIdentification: '123456789',
        numeroCnas: '88 1234 5678 99',
        dateDebutContrat: '2024-05-01T00:00:00.000Z',
      }),
    })

    render(<WorkerForm onSuccess={onSuccess} />)

    await userEvent.type(screen.getByLabelText(/Nom et Prénom de l'Employé/i), 'Ali Larbi')
    await userEvent.type(
      screen.getByLabelText(/Numéro d'Identification \(CIN \/ Matricule\)/i),
      '123456789'
    )
    await userEvent.type(screen.getByLabelText(/Numéro CNAS/i), '88 1234 5678 99')
    await userEvent.type(screen.getByLabelText(/Date de Début de Contrat/i), '2024-05-01')

    const submitBtn = screen.getByRole('button', { name: /créer|enregistrer/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: 'Ali Larbi',
          numeroIdentification: '123456789',
          numeroCnas: '88 1234 5678 99',
          dateDebutContrat: '2024-05-01',
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Employé créé avec succès')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('pre-fills data and submits PATCH /api/personnel/[id] in edit mode', async () => {
    const onSuccess = jest.fn()
    const initialWorker = {
      id: 'worker-42',
      nom: 'Karim Ziani',
      numeroIdentification: 'CIN-999',
      numeroCnas: '84 5555 4444 33',
      dateDebutContrat: '2023-01-10T00:00:00.000Z',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ...initialWorker,
        nom: 'Karim Ziani Modifié',
      }),
    })

    render(<WorkerForm worker={initialWorker} onSuccess={onSuccess} />)

    const nomInput = screen.getByLabelText(/Nom et Prénom de l'Employé/i)
    expect(nomInput).toHaveValue('Karim Ziani')
    expect(
      screen.getByLabelText(/Numéro d'Identification \(CIN \/ Matricule\)/i)
    ).toHaveValue('CIN-999')
    expect(screen.getByLabelText(/Numéro CNAS/i)).toHaveValue('84 5555 4444 33')
    expect(screen.getByLabelText(/Date de Début de Contrat/i)).toHaveValue('2023-01-10')

    await userEvent.clear(nomInput)
    await userEvent.type(nomInput, 'Karim Ziani Modifié')

    const submitBtn = screen.getByRole('button', { name: /enregistrer|modifier/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/personnel/worker-42', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: 'Karim Ziani Modifié',
          numeroIdentification: 'CIN-999',
          numeroCnas: '84 5555 4444 33',
          dateDebutContrat: '2023-01-10',
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Employé modifié avec succès')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('sends null when optional fields are cleared in edit mode', async () => {
    const onSuccess = jest.fn()
    const initialWorker = {
      id: 'worker-42',
      nom: 'Karim Ziani',
      numeroIdentification: 'CIN-999',
      numeroCnas: '84 5555 4444 33',
      dateDebutContrat: '2023-01-10',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'worker-42',
        nom: 'Karim Ziani',
        numeroIdentification: null,
        numeroCnas: null,
        dateDebutContrat: null,
      }),
    })

    render(<WorkerForm worker={initialWorker} onSuccess={onSuccess} />)

    await userEvent.clear(
      screen.getByLabelText(/Numéro d'Identification \(CIN \/ Matricule\)/i)
    )
    await userEvent.clear(screen.getByLabelText(/Numéro CNAS/i))
    await userEvent.clear(screen.getByLabelText(/Date de Début de Contrat/i))

    const submitBtn = screen.getByRole('button', { name: /enregistrer|modifier/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/personnel/worker-42', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: 'Karim Ziani',
          numeroIdentification: null,
          numeroCnas: null,
          dateDebutContrat: null,
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Employé modifié avec succès')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('handles API error responses and displays toast error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Erreur serveur de validation' }),
    })

    render(<WorkerForm onSuccess={jest.fn()} />)

    await userEvent.type(screen.getByLabelText(/Nom et Prénom de l'Employé/i), 'Salarié Erreur')
    const submitBtn = screen.getByRole('button', { name: /créer|enregistrer/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erreur serveur de validation')
    })
  })
})
