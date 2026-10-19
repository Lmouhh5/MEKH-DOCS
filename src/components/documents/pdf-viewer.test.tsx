import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PdfViewer } from './pdf-viewer'

describe('PdfViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.location.href = 'http://localhost/'
  })

  it('renders iframe with initialUrl', () => {
    render(<PdfViewer documentId="d1" initialUrl="http://minio/sample.pdf" />)
    const iframe = screen.getByTitle(/aperçu du document pdf/i)
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute('src', 'http://minio/sample.pdf')
  })

  it('fetches a new signed URL on window focus when URL is near expiry', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ url: 'http://minio/refreshed.pdf' })
    global.fetch = fetchMock

    render(
      <PdfViewer
        documentId="d1"
        initialUrl="http://minio/old.pdf"
        expiresAt={Date.now() + 90_000}
      />
    )

    fireEvent(window, new Event('focus'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/documents/d1/signed-url')
    })

    const iframe = screen.getByTitle(/aperçu du document pdf/i)
    await waitFor(() => {
      expect(iframe).toHaveAttribute('src', 'http://minio/refreshed.pdf')
    })
  })

  it('does not refetch on window focus when URL is far from expiry', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock

    render(
      <PdfViewer
        documentId="d1"
        initialUrl="http://minio/valid.pdf"
        expiresAt={Date.now() + 600_000}
      />
    )

    fireEvent(window, new Event('focus'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('redirects to /login when signed-url request returns 401', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({ error: 'Non autorisé' }),
    })
    global.fetch = fetchMock

    render(
      <PdfViewer
        documentId="d1"
        initialUrl="http://minio/old.pdf"
        expiresAt={Date.now() + 50_000}
      />
    )

    fireEvent(window, new Event('focus'))

    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith('/login')
    })
  })
})
