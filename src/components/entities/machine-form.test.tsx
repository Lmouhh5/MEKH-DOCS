import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MachineForm } from './machine-form'
import { toast } from 'sonner'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('MachineForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders form fields with correct French labels', () => {
    render(<MachineForm onSuccess={jest.fn()} />)

    expect(screen.getByLabelText(/Identifiant \/ Code Machine/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Marque/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Modèle/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Numéro de série \/ Châssis \(VIN\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Matricule \/ Immatriculation/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Statut/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enregistrer|créer/i })).toBeInTheDocument()
  })

  it('prevents submission and shows toast error when machineId is empty', async () => {
    render(<MachineForm onSuccess={jest.fn()} />)

    const submitBtn = screen.getByRole('button', { name: /enregistrer|créer/i })
    await userEvent.click(submitBtn)

    expect(global.fetch).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith("L'identifiant de la machine est requis")
  })

  it('submits POST /api/materiel and calls onSuccess on successful creation', async () => {
    const onSuccess = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'm-1',
        machineId: 'ENG-001',
        marque: 'Caterpillar',
        modele: '320D',
        numeroSerie: 'CAT320D123',
        matricule: '01234-116-16',
        statut: 'ACTIF',
      }),
    })

    render(<MachineForm onSuccess={onSuccess} />)

    await userEvent.type(screen.getByLabelText(/Identifiant \/ Code Machine/i), 'ENG-001')
    await userEvent.type(screen.getByLabelText(/Marque/i), 'Caterpillar')
    await userEvent.type(screen.getByLabelText(/Modèle/i), '320D')
    await userEvent.type(screen.getByLabelText(/Numéro de série \/ Châssis \(VIN\)/i), 'CAT320D123')
    await userEvent.type(screen.getByLabelText(/Matricule \/ Immatriculation/i), '01234-116-16')

    const submitBtn = screen.getByRole('button', { name: /enregistrer|créer/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/materiel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: 'ENG-001',
          marque: 'Caterpillar',
          modele: '320D',
          numeroSerie: 'CAT320D123',
          matricule: '01234-116-16',
          statut: 'ACTIF',
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Matériel créé avec succès')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('pre-fills data and submits PATCH /api/materiel/[id] in edit mode', async () => {
    const onSuccess = jest.fn()
    const initialMachine = {
      id: 'm-42',
      machineId: 'ENG-042',
      marque: 'Komatsu',
      modele: 'PC200',
      numeroSerie: 'KOM12345',
      matricule: '00999-118-16',
      statut: 'ACTIF' as const,
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ...initialMachine,
        statut: 'EN_MAINTENANCE',
      }),
    })

    render(<MachineForm machine={initialMachine} onSuccess={onSuccess} />)

    const idInput = screen.getByLabelText(/Identifiant \/ Code Machine/i)
    expect(idInput).toHaveValue('ENG-042')
    expect(screen.getByLabelText(/Marque/i)).toHaveValue('Komatsu')
    expect(screen.getByLabelText(/Modèle/i)).toHaveValue('PC200')
    expect(screen.getByLabelText(/Numéro de série \/ Châssis \(VIN\)/i)).toHaveValue('KOM12345')
    expect(screen.getByLabelText(/Matricule \/ Immatriculation/i)).toHaveValue('00999-118-16')
    expect(screen.getByLabelText(/Statut/i)).toHaveValue('ACTIF')

    await userEvent.selectOptions(screen.getByLabelText(/Statut/i), 'EN_MAINTENANCE')

    const submitBtn = screen.getByRole('button', { name: /enregistrer|modifier/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/materiel/m-42', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: 'ENG-042',
          marque: 'Komatsu',
          modele: 'PC200',
          numeroSerie: 'KOM12345',
          matricule: '00999-118-16',
          statut: 'EN_MAINTENANCE',
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Matériel modifié avec succès')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('sends null when optional fields are cleared in edit mode', async () => {
    const onSuccess = jest.fn()
    const initialMachine = {
      id: 'm-42',
      machineId: 'ENG-042',
      marque: 'Komatsu',
      modele: 'PC200',
      numeroSerie: 'KOM12345',
      matricule: '00999-118-16',
      statut: 'ACTIF' as const,
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'm-42',
        machineId: 'ENG-042',
        marque: null,
        modele: null,
        numeroSerie: null,
        matricule: null,
        statut: 'ACTIF',
      }),
    })

    render(<MachineForm machine={initialMachine} onSuccess={onSuccess} />)

    await userEvent.clear(screen.getByLabelText(/Marque/i))
    await userEvent.clear(screen.getByLabelText(/Modèle/i))
    await userEvent.clear(screen.getByLabelText(/Numéro de série \/ Châssis \(VIN\)/i))
    await userEvent.clear(screen.getByLabelText(/Matricule \/ Immatriculation/i))

    const submitBtn = screen.getByRole('button', { name: /enregistrer|modifier/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/materiel/m-42', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: 'ENG-042',
          marque: null,
          modele: null,
          numeroSerie: null,
          matricule: null,
          statut: 'ACTIF',
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Matériel modifié avec succès')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('handles API error responses and displays toast error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Cet identifiant de machine existe déjà' }),
    })

    render(<MachineForm onSuccess={jest.fn()} />)

    await userEvent.type(screen.getByLabelText(/Identifiant \/ Code Machine/i), 'ENG-001')
    const submitBtn = screen.getByRole('button', { name: /enregistrer|créer/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Cet identifiant de machine existe déjà')
    })
  })
})
