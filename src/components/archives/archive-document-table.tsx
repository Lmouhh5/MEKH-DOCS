'use client'

import React, { useState, useMemo } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { MoveDocumentDialog } from './move-document-dialog'
import { cn } from '@/lib/utils'
import {
  SearchIcon,
  FileTextIcon,
  FolderInputIcon,
  Trash2Icon,
  MapPinIcon,
  AlertTriangleIcon,
  Loader2Icon,
  InboxIcon,
} from 'lucide-react'
import { toast } from 'sonner'

export interface ArchiveDocumentItem {
  id: string
  title: string
  documentType?: string | null
  module?: string | null
  issueDate: string
  dueDate?: string | null
  amount?: number | null
  isPaid?: boolean | null
  physicalLocation?: string | null
  notes?: string | null
  fileKey?: string
  archiveClusterId?: string | null
  signedUrl?: string | null
  url?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ArchiveDocumentTableProps {
  documents: ArchiveDocumentItem[]
  clusterId: string
  clusterName?: string
  onRefresh?: () => void
}

function formatDZD(amount?: number | null): string {
  if (amount == null || isNaN(amount)) return '—'
  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DZD`
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ArchiveDocumentTable({
  documents,
  clusterId,
  clusterName,
  onRefresh,
}: ArchiveDocumentTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [movingDoc, setMovingDoc] = useState<ArchiveDocumentItem | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<ArchiveDocumentItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents
    const q = searchQuery.toLowerCase().trim()
    return documents.filter((doc) => {
      const titleMatch = doc.title?.toLowerCase().includes(q)
      const notesMatch = doc.notes?.toLowerCase().includes(q)
      const locMatch = doc.physicalLocation?.toLowerCase().includes(q)
      const typeMatch = doc.documentType?.toLowerCase().includes(q)
      return titleMatch || notesMatch || locMatch || typeMatch
    })
  }, [documents, searchQuery])

  const handleDelete = async () => {
    if (!deletingDoc) return
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/archive/documents/${deletingDoc.id}`, {
        method: 'DELETE',
      })

      const data = (await res.json().catch(() => ({}))) as { error?: string }

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la suppression du document')
        return
      }

      toast.success('Document supprimé avec succès')
      setDeletingDoc(null)
      onRefresh?.()
    } catch {
      toast.error('Erreur réseau lors de la suppression du document')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans ce dossier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-xs text-muted-foreground self-center sm:self-auto">
          {filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''}{' '}
          {searchQuery && `trouvé${filteredDocuments.length > 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Documents Table */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg bg-muted/10">
          <div className="p-3 rounded-full bg-muted/40 mb-3 text-muted-foreground">
            <InboxIcon className="size-8" />
          </div>
          <p className="font-semibold text-foreground text-sm">
            {clusterName
              ? `Aucun document archivé dans « ${clusterName} ».`
              : 'Aucun document archivé dans ce dossier.'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Ajoutez un premier document avec le bouton « Déposer un document » ou déplacez des fichiers existants.
          </p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-lg bg-muted/10 text-muted-foreground">
          <p className="text-sm font-medium">Aucun document ne correspond à votre recherche.</p>
          <p className="text-xs mt-1 text-muted-foreground/80">
            Essayez de modifier votre mot-clé de recherche.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/70 overflow-hidden bg-card shadow-xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="font-semibold text-xs min-w-[220px]">
                  Document
                </TableHead>
                <TableHead className="font-semibold text-xs whitespace-nowrap">
                  Date d&apos;émission
                </TableHead>
                <TableHead className="font-semibold text-xs whitespace-nowrap">
                  Échéance / Validité
                </TableHead>
                <TableHead className="font-semibold text-xs whitespace-nowrap">
                  Montant
                </TableHead>
                <TableHead className="font-semibold text-xs text-right whitespace-nowrap">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => {
                const pdfUrl =
                  doc.signedUrl || doc.url || `/api/archive/documents/${doc.id}`
                return (
                  <TableRow key={doc.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="align-top py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground text-sm">
                          {doc.title}
                        </span>
                        {doc.notes && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {doc.notes}
                          </span>
                        )}
                        {doc.physicalLocation && (
                          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                            <MapPinIcon className="size-3 shrink-0" />
                            <span>Emplacement : {doc.physicalLocation}</span>
                          </div>
                        )}
                        {doc.documentType && (
                          <div className="mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {doc.documentType}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="align-top py-3 text-xs whitespace-nowrap font-mono text-muted-foreground">
                      {formatDate(doc.issueDate)}
                    </TableCell>

                    <TableCell className="align-top py-3 text-xs whitespace-nowrap font-mono text-muted-foreground">
                      {formatDate(doc.dueDate)}
                    </TableCell>

                    <TableCell className="align-top py-3 text-xs whitespace-nowrap font-mono font-medium text-foreground">
                      {formatDZD(doc.amount)}
                    </TableCell>

                    <TableCell className="align-top py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            'h-8 px-2.5 text-xs gap-1.5'
                          )}
                        >
                          <FileTextIcon className="size-3.5" />
                          Voir PDF
                        </a>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => setMovingDoc(doc)}
                        >
                          <FolderInputIcon className="size-3.5" />
                          Déplacer
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs gap-1.5 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingDoc(doc)}
                        >
                          <Trash2Icon className="size-3.5" />
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Move Document Dialog */}
      {movingDoc && (
        <MoveDocumentDialog
          documentId={movingDoc.id}
          documentTitle={movingDoc.title}
          currentClusterId={clusterId}
          open={Boolean(movingDoc)}
          onOpenChange={(open) => {
            if (!open) setMovingDoc(null)
          }}
          onSuccess={() => {
            setMovingDoc(null)
            onRefresh?.()
          }}
        />
      )}

      {/* Delete Document Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingDoc)}
        onOpenChange={(open) => {
          if (!open) setDeletingDoc(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangleIcon className="size-5 shrink-0" />
              <DialogTitle>Supprimer le document</DialogTitle>
            </div>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement le document «{' '}
              <span className="font-semibold text-foreground">
                {deletingDoc?.title}
              </span>{' '}
              » ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingDoc(null)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Confirmer la suppression'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
