import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaidToggle } from './paid-toggle'
import { toast } from 'sonner'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('PaidToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders "Impayé" when isPaid is false', () => {
    render(<PaidToggle documentId="doc-1" isPaid={false} />)
    expect(screen.getByText('Impayé')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('renders "Payé" when isPaid is true', () => {
    render(<PaidToggle documentId="doc-1" isPaid={true} />)
    expect(screen.getByText('Payé')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('toggles payment status and calls PATCH /api/documents/[id]', async () => {
    const onToggle = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'doc-1', isPaid: true }),
    })

    render(<PaidToggle documentId="doc-1" isPaid={false} onToggle={onToggle} />)
    const switchEl = screen.getByRole('switch')
    await userEvent.click(switchEl)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: true }),
      })
    })

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith(true)
      expect(toast.success).toHaveBeenCalledWith('Document marqué comme payé')
    })
  })

  it('reverts status and displays error toast on network error', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<PaidToggle documentId="doc-1" isPaid={false} />)
    const switchEl = screen.getByRole('switch')
    await userEvent.click(switchEl)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erreur lors de la mise à jour du statut de paiement')
    })
  })
})
