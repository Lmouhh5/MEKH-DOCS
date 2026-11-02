'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { DOCUMENT_TYPE_LABELS, DocumentTypeKey } from '@/lib/constants'
import { Link2Icon, PlusIcon, UnlinkIcon, CalendarIcon, Building2Icon, SearchIcon, Loader2Icon } from 'lucide-react'

export interface LinkedDocumentItem {
  id: string
  title: string
  documentType: string
  module: string
  issueDate: string
  dueDate?: string | null
  amount?: number | null
  isPaid?: boolean | null
  entityName?: string | null
  signedUrl?: string
  url?: string
}

export interface DocumentLinkWidgetProps {
  documentId: string
  onSelectLinkedDocument?: (docId: string) => void
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function DocumentLinkWidget({
  documentId,
  onSelectLinkedDocument,
}: DocumentLinkWidgetProps) {
  const [links, setLinks] = useState<LinkedDocumentItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<LinkedDocumentItem[]>([])
  const [searching, setSearching] = useState<boolean>(false)
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null)

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/links`)
      if (res?.ok) {
        const data: LinkedDocumentItem[] = await res.json()
        setLinks(data)
      }
    } catch (err) {
      console.error('Failed to fetch linked documents:', err)
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    if (documentId) {
      void fetchLinks()
    }
  }, [documentId, fetchLinks])

  const performSearch = useCallback(
    async (query: string) => {
      setSearching(true)
      try {
        const url = query.trim()
          ? `/api/search?entity=${encodeURIComponent(query.trim())}`
          : `/api/search`
        const res = await fetch(url)
        if (res?.ok) {
          const data: LinkedDocumentItem[] = await res.json()
          setSearchResults(data)
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setSearching(false)
      }
    },
    []
  )

  useEffect(() => {
    if (isDialogOpen) {
      const timer = setTimeout(() => {
        void performSearch(searchQuery)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isDialogOpen, searchQuery, performSearch])

  const handleLinkDocument = async (candidate: LinkedDocumentItem) => {
    setActionInProgressId(candidate.id)
    try {
      const res = await fetch(`/api/documents/${documentId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: candidate.id }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Erreur lors de la liaison du document')
      }

      toast.success('Document lié avec succès')
      setLinks((prev) => [...prev, candidate])
      setIsDialogOpen(false)
      setSearchQuery('')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Impossible de lier le document'
      toast.error(msg)
    } finally {
      setActionInProgressId(null)
    }
  }

  const handleUnlink = async (targetId: string) => {
    setActionInProgressId(targetId)
    try {
      const res = await fetch(`/api/documents/${documentId}/links?targetId=${targetId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Erreur lors de la déliaison')
      }

      toast.success('Document délié avec succès')
      setLinks((prev) => prev.filter((item) => item.id !== targetId))
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Impossible de délier le document'
      toast.error(msg)
    } finally {
      setActionInProgressId(null)
    }
  }

  // Filter candidates: exclude current document and already linked documents
  const candidateList = searchResults.filter(
    (item) => item.id !== documentId && !links.some((l) => l.id === item.id)
  )

  return (
    <div
      data-testid="document-link-widget"
      className="p-4 rounded-lg border border-border/60 bg-muted/10 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2Icon className="size-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground">
            Documents Liés & Chaîne Documentaire
          </h3>
          {links.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {links.length}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5 cursor-pointer"
          onClick={() => {
            setIsDialogOpen(true)
          }}
        >
          <PlusIcon className="size-3.5" />
          <span>Lier un document</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 pt-1">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      ) : links.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">
          Aucun document lié pour le moment.
        </p>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          {links.map((linkDoc) => (
            <div
              key={linkDoc.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-md border border-border/50 bg-card hover:bg-accent/40 transition-colors text-xs"
            >
              <div
                className="flex flex-col gap-1 min-w-0 cursor-pointer flex-1"
                onClick={() => onSelectLinkedDocument?.(linkDoc.id)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                    {DOCUMENT_TYPE_LABELS[linkDoc.documentType as DocumentTypeKey] ||
                      linkDoc.documentType}
                  </Badge>
                  <span className="font-semibold text-foreground truncate hover:underline">
                    {linkDoc.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                  {linkDoc.entityName && (
                    <span className="flex items-center gap-1 truncate">
                      <Building2Icon className="size-3 shrink-0" />
                      {linkDoc.entityName}
                    </span>
                  )}
                  <span className="flex items-center gap-1 shrink-0">
                    <CalendarIcon className="size-3 shrink-0" />
                    {formatDate(linkDoc.issueDate)}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
                disabled={actionInProgressId === linkDoc.id}
                onClick={(e) => {
                  e.stopPropagation()
                  void handleUnlink(linkDoc.id)
                }}
              >
                <UnlinkIcon className="size-3.5 mr-1" />
                Délier
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Dialog de liaison */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lier un document</DialogTitle>
            <DialogDescription>
              Recherchez et sélectionnez un document pour établir un lien avec le document actuel.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre, client, fournisseur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto flex flex-col gap-2 pr-1">
              {searching ? (
                <div className="flex items-center justify-center p-6 text-xs text-muted-foreground gap-2">
                  <Loader2Icon className="size-4 motion-safe:animate-spin" />
                  <span>Recherche en cours…</span>
                </div>
              ) : candidateList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 italic">
                  Aucun document disponible à lier.
                </p>
              ) : (
                candidateList.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-md border border-border/40 hover:bg-accent/40 text-xs"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {DOCUMENT_TYPE_LABELS[candidate.documentType as DocumentTypeKey] ||
                            candidate.documentType}
                        </Badge>
                        <span className="font-medium text-foreground truncate">
                          {candidate.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                        {candidate.entityName && <span>{candidate.entityName}</span>}
                        <span>•</span>
                        <span>{formatDate(candidate.issueDate)}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="h-7 text-xs px-2.5 shrink-0 cursor-pointer"
                      disabled={actionInProgressId === candidate.id}
                      onClick={() => void handleLinkDocument(candidate)}
                    >
                      {actionInProgressId === candidate.id ? (
                        <Loader2Icon className="size-3 motion-safe:animate-spin" />
                      ) : (
                        'Lier'
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
