'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FolderIcon, FolderInputIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

export interface ClusterTreeNode {
  id: string
  name: string
  parentId?: string | null
  children?: ClusterTreeNode[]
}

export interface MoveDocumentDialogProps {
  documentId: string
  documentTitle: string
  currentClusterId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  clusters?: ClusterTreeNode[]
}

interface FlatClusterItem {
  id: string
  name: string
  level: number
  path: string
}

export function MoveDocumentDialog({
  documentId,
  documentTitle,
  currentClusterId,
  open,
  onOpenChange,
  onSuccess,
  clusters: propClusters,
}: MoveDocumentDialogProps) {
  const [treeData, setTreeData] = useState<ClusterTreeNode[]>(propClusters || [])
  const [loading, setLoading] = useState(false)
  const [moving, setMoving] = useState(false)
  const [selectedClusterId, setSelectedClusterId] = useState<string>('')

  useEffect(() => {
    if (propClusters) {
      setTreeData(propClusters)
    }
  }, [propClusters])

  useEffect(() => {
    if (open) {
      setSelectedClusterId('')
      setMoving(false)

      if (!propClusters) {
        setLoading(true)
        fetch('/api/archive/clusters?tree=true')
          .then((res) => {
            if (!res.ok) throw new Error('Impossible de charger les dossiers')
            return res.json()
          })
          .then((data) => {
            setTreeData(Array.isArray(data) ? data : [])
          })
          .catch((err) => {
            toast.error(err?.message || 'Erreur lors du chargement des dossiers')
          })
          .finally(() => {
            setLoading(false)
          })
      }
    }
  }, [open, propClusters])

  // Flatten tree with indentation and path
  const flatClusters = useMemo(() => {
    const list: FlatClusterItem[] = []

    const traverse = (nodes: ClusterTreeNode[], level = 0, parentPath = '') => {
      for (const node of nodes) {
        const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name
        list.push({
          id: node.id,
          name: node.name,
          level,
          path: currentPath,
        })
        if (node.children && node.children.length > 0) {
          traverse(node.children, level + 1, currentPath)
        }
      }
    }

    traverse(treeData)
    return list
  }, [treeData])

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClusterId) {
      toast.error('Veuillez sélectionner un dossier de destination')
      return
    }

    if (selectedClusterId === currentClusterId) {
      toast.error('Le document est déjà dans ce dossier')
      return
    }

    try {
      setMoving(true)
      const res = await fetch(`/api/archive/documents/${documentId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetClusterId: selectedClusterId }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors du déplacement du document')
        return
      }

      toast.success('Document déplacé avec succès')
      onSuccess?.()
      onOpenChange(false)
    } catch {
      toast.error('Erreur réseau lors du déplacement du document')
    } finally {
      setMoving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FolderInputIcon className="size-5 text-primary" />
            <DialogTitle>Déplacer le document</DialogTitle>
          </div>
          <DialogDescription>
            Déplacer « {documentTitle} » vers un autre dossier d&apos;archive.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleMove} className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Sélectionnez le dossier de destination :
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
                <Loader2Icon className="size-4 animate-spin" />
                <span>Chargement de l&apos;arborescence...</span>
              </div>
            ) : flatClusters.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 italic">
                Aucun autre dossier disponible.
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto rounded-md border border-border p-2 space-y-1">
                {flatClusters.map((cluster) => {
                  const isCurrent = cluster.id === currentClusterId
                  const isSelected = selectedClusterId === cluster.id

                  return (
                    <label
                      key={cluster.id}
                      htmlFor={`cluster-dest-${cluster.id}`}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer select-none transition-colors ${
                        isCurrent
                          ? 'opacity-50 cursor-not-allowed bg-muted/40'
                          : isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-accent'
                      }`}
                      style={{ paddingLeft: `${cluster.level * 16 + 8}px` }}
                    >
                      <input
                        type="radio"
                        id={`cluster-dest-${cluster.id}`}
                        name="targetCluster"
                        value={cluster.id}
                        disabled={isCurrent}
                        checked={isSelected}
                        onChange={() => setSelectedClusterId(cluster.id)}
                        className="size-3.5 text-primary focus:ring-primary"
                      />
                      <FolderIcon
                        className={`size-3.5 shrink-0 ${
                          isCurrent
                            ? 'text-muted-foreground'
                            : isSelected
                            ? 'text-primary'
                            : 'text-amber-500'
                        }`}
                      />
                      <span className="truncate">
                        {cluster.name}
                        {isCurrent && (
                          <span className="ml-1.5 text-[10px] italic text-muted-foreground font-normal">
                            (Actuel)
                          </span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={moving}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={moving || loading || !selectedClusterId || selectedClusterId === currentClusterId}
            >
              {moving ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Déplacement...
                </>
              ) : (
                'Déplacer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
