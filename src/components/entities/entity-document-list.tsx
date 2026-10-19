'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ModuleKey } from '@/lib/constants'
import { DocumentSummary } from '@/lib/types'
import { DocumentList } from '@/components/documents/document-list'
import { DocumentDetailPanel } from '@/components/documents/document-detail-panel'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PlusIcon, Loader2Icon } from 'lucide-react'

export interface EntityDocumentListProps {
  module: ModuleKey
  entityId: string
  initialDocuments?: DocumentSummary[]
  uploadHref?: string
  className?: string
}

function getEntityQueryParam(module: ModuleKey): string {
  switch (module) {
    case 'CLIENTS':
      return 'clientId'
    case 'FOURNISSEURS':
      return 'fournisseurId'
    case 'MATERIEL':
      return 'machineId'
    case 'PERSONNEL':
      return 'travailleurId'
    default:
      return 'entityId'
  }
}

export function EntityDocumentList({
  module,
  entityId,
  initialDocuments,
  uploadHref,
  className,
}: EntityDocumentListProps) {
  const [documents, setDocuments] = useState<DocumentSummary[]>(initialDocuments || [])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [loading, setLoading] = useState(!initialDocuments)

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const paramName = getEntityQueryParam(module)
      const res = await fetch(`/api/documents?module=${module}&${paramName}=${entityId}`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data)
      }
    } catch (err) {
      console.error('Failed to fetch documents for entity:', err)
    } finally {
      setLoading(false)
    }
  }, [module, entityId])

  useEffect(() => {
    if (!initialDocuments) {
      fetchDocuments()
    }
  }, [initialDocuments, fetchDocuments])

  const defaultUploadHref = `/${module.toLowerCase()}/${entityId}/nouveau-document`
  const targetUploadHref = uploadHref || defaultUploadHref

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Documents du Client</h3>
          <p className="text-sm text-muted-foreground">
            {documents.length} document{documents.length > 1 ? 's' : ''} associé{documents.length > 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href={targetUploadHref}
          className={cn(buttonVariants({ size: 'sm' }))}
        >
          <PlusIcon className="size-4 mr-1.5" />
          Nouveau document
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          <Loader2Icon className="size-6 animate-spin mr-2" />
          <span>Chargement des documents...</span>
        </div>
      ) : (
        <DocumentList
          documents={documents}
          onSelect={(id) => setSelectedDocId(id)}
        />
      )}

      <DocumentDetailPanel
        documentId={selectedDocId}
        isOpen={Boolean(selectedDocId)}
        onClose={() => setSelectedDocId(null)}
        onDocumentUpdated={fetchDocuments}
      />
    </div>
  )
}
