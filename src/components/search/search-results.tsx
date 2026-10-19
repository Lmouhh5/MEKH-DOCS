'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { DocumentSummary } from '@/lib/types'
import { DocumentList } from '@/components/documents/document-list'
import { DocumentDetailPanel } from '@/components/documents/document-detail-panel'
import { Skeleton } from '@/components/ui/skeleton'
import { FileSearchIcon, AlertCircleIcon } from 'lucide-react'

export interface SearchResultsProps {
  className?: string
}

export function SearchResults({ className = '' }: SearchResultsProps) {
  const searchParams = useSearchParams()
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)

  const fetchResults = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const queryString = searchParams.toString()
      const url = queryString ? `/api/search?${queryString}` : '/api/search'
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error('Erreur lors de la récupération des documents')
      }
      const data: DocumentSummary[] = await res.json()
      setDocuments(data)
    } catch {
      setError('Impossible de charger les résultats de recherche')
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    void fetchResults()
  }, [fetchResults])

  const count = documents.length
  const countLabel =
    count === 0
      ? '0 document trouvé'
      : count === 1
      ? '1 document trouvé'
      : `${count} documents trouvés`

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header bar with count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        {!loading && !error && (
          <span className="font-medium text-foreground">{countLabel}</span>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div
          data-testid="search-loading-skeleton"
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-lg border border-border/50 bg-card space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-1/3" />
              <div className="pt-2 border-t border-border/40 flex justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-8 border border-destructive/20 bg-destructive/5 rounded-lg flex flex-col items-center justify-center text-center text-destructive gap-2 my-4">
          <AlertCircleIcon className="size-8" />
          <p className="text-sm font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => void fetchResults()}
            className="text-xs underline hover:text-destructive/80 mt-1 cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && count === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-muted/10 text-muted-foreground my-4">
          <div className="p-3 rounded-full bg-muted/40 mb-3 text-muted-foreground/80">
            <FileSearchIcon className="size-8" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Aucun document trouvé correspondant à vos critères de recherche
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Essayez de modifier vos filtres ou vos termes de recherche.
          </p>
        </div>
      )}

      {/* Results grid */}
      {!loading && !error && count > 0 && (
        <DocumentList
          documents={documents}
          onSelect={(id) => setSelectedDocId(id)}
        />
      )}

      {/* Detail Panel */}
      <DocumentDetailPanel
        documentId={selectedDocId}
        isOpen={Boolean(selectedDocId)}
        onClose={() => setSelectedDocId(null)}
        onDocumentUpdated={fetchResults}
      />
    </div>
  )
}
