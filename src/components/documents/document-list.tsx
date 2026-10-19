'use client'

import React from 'react'
import { DocumentSummary } from '@/lib/types'
import { DocumentCard } from '@/components/documents/document-card'
import { FileQuestionIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DocumentListProps {
  documents: DocumentSummary[]
  onSelect?: (id: string) => void
  className?: string
}

export function DocumentList({
  documents,
  onSelect,
  className,
}: DocumentListProps) {
  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg bg-muted/10 text-muted-foreground my-4">
        <div className="p-3 rounded-full bg-muted/40 mb-3 text-muted-foreground/80">
          <FileQuestionIcon className="size-6" />
        </div>
        <p className="text-sm font-medium">Aucun document trouvé</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Aucun document n&apos;a été enregistré pour le moment.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-3', className)}>
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
