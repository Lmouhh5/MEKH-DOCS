'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { DeleteClusterDialog } from './delete-cluster-dialog'
import {
  FolderIcon,
  PencilIcon,
  Trash2Icon,
  CalendarIcon,
  FilesIcon,
  FolderTreeIcon,
  Loader2Icon,
} from 'lucide-react'
import { toast } from 'sonner'

export interface ClusterCardData {
  id: string
  name: string
  description?: string | null
  parentId?: string | null
  subClustersCount?: number
  totalDocumentsCount?: number
  lastDocumentDate?: string | null
  _count?: {
    documents?: number
    children?: number
  }
  createdAt?: string
  updatedAt?: string
}

export interface ClusterCardProps {
  cluster: ClusterCardData
  onRefresh?: () => void
  onDelete?: (clusterId: string) => void
  onRename?: (clusterId: string, newName: string) => void
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Aucun document'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Aucun document'
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ClusterCard({
  cluster,
  onRefresh,
  onDelete,
  onRename,
}: ClusterCardProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newName, setNewName] = useState(cluster.name)
  const [renaming, setRenaming] = useState(false)

  const docCount = cluster.totalDocumentsCount ?? cluster._count?.documents ?? 0
  const subCount = cluster.subClustersCount ?? cluster._count?.children ?? 0
  const formattedDate = formatDate(cluster.lastDocumentDate)

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) {
      toast.error('Le nom du dossier est requis')
      return
    }

    try {
      setRenaming(true)
      const res = await fetch(`/api/archive/clusters/${cluster.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })

      const data = (await res.json().catch(() => ({}))) as { error?: string }

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la modification')
        return
      }

      toast.success('Dossier renommé avec succès')
      onRename?.(cluster.id, trimmed)
      onRefresh?.()
      setRenameOpen(false)
    } catch {
      toast.error('Erreur réseau lors de la modification')
    } finally {
      setRenaming(false)
    }
  }

  return (
    <>
      <Card className="hover:border-primary/50 transition-all shadow-xs relative overflow-hidden group/card bg-card">
        <div className="p-4 sm:p-5 flex flex-col justify-between h-full gap-4">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/archives/${cluster.id}`}
              className="flex items-start gap-3 flex-1 min-w-0 group/link"
            >
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0 group-hover/link:bg-primary/20 transition-colors">
                <FolderIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-base tracking-tight truncate group-hover/link:text-primary transition-colors">
                  {cluster.name}
                </h3>
                {cluster.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {cluster.description}
                  </p>
                )}
              </div>
            </Link>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  setNewName(cluster.name)
                  setRenameOpen(true)
                }}
              >
                <PencilIcon className="size-3.5 mr-1" />
                Renommer
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteOpen(true)
                }}
              >
                <Trash2Icon className="size-3.5 mr-1" />
                Supprimer
              </Button>
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 font-normal">
                <FilesIcon className="size-3" />
                {docCount} document{docCount > 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="gap-1 font-normal">
                <FolderTreeIcon className="size-3" />
                {subCount} sous-dossier{subCount > 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <CalendarIcon className="size-3 shrink-0" />
              {cluster.lastDocumentDate ? (
                <span>Dernier doc : {formattedDate}</span>
              ) : (
                <span>Aucun document</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renommer le dossier</DialogTitle>
            <DialogDescription>
              Modifier le nom du dossier d&apos;archives.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor={`rename-cluster-${cluster.id}`}>
                Nouveau nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`rename-cluster-${cluster.id}`}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={renaming}
                autoFocus
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
                disabled={renaming}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={renaming}>
                {renaming ? (
                  <>
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                    Modification...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteClusterDialog
        clusterId={cluster.id}
        clusterName={cluster.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => {
          onDelete?.(cluster.id)
          onRefresh?.()
        }}
      />
    </>
  )
}
