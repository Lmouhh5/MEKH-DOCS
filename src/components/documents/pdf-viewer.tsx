'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'

export interface PdfViewerProps {
  documentId: string
  initialUrl: string
  expiresAt?: number
}

export function PdfViewer({
  documentId,
  initialUrl,
  expiresAt,
}: PdfViewerProps) {
  const [currentUrl, setCurrentUrl] = useState<string>(initialUrl)
  // Default signed URL expiry is 15 minutes (900 seconds) if not provided
  const expiresAtRef = useRef<number>(expiresAt ?? Date.now() + 15 * 60 * 1000)

  // Keep ref in sync if expiresAt prop changes
  useEffect(() => {
    if (expiresAt !== undefined) {
      expiresAtRef.current = expiresAt
    }
  }, [expiresAt])

  useEffect(() => {
    setCurrentUrl(initialUrl)
  }, [initialUrl])

  const refreshSignedUrl = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/signed-url`)
      if (res && res.status === 401) {
        if (typeof window !== 'undefined') {
          if (typeof window.location.assign === 'function') {
            window.location.assign('/login')
          } else {
            window.location.href = '/login'
          }
        }
        return
      }

      let newUrl: string | undefined
      if (typeof res?.json === 'function') {
        const data = await res.json()
        newUrl = data?.url
      } else if ((res as unknown as { url?: string })?.url) {
        newUrl = (res as unknown as { url?: string }).url
      }

      if (newUrl) {
        setCurrentUrl(newUrl)
        expiresAtRef.current = Date.now() + 15 * 60 * 1000
      }
    } catch (err) {
      console.error('Erreur lors du rafraîchissement du lien signé:', err)
    }
  }, [documentId])

  useEffect(() => {
    const handleFocus = () => {
      // If within 2 minutes (120,000 ms) of expiry or already expired
      const isNearExpiry = Date.now() > expiresAtRef.current - 120_000
      if (isNearExpiry) {
        void refreshSignedUrl()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [refreshSignedUrl])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <iframe
        src={currentUrl}
        title="Aperçu du document PDF"
        className="w-full h-full min-h-[500px] border rounded bg-muted/20"
      />
    </div>
  )
}
