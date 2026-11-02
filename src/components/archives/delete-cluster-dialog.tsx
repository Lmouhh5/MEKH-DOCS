'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangleIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

export interface DeleteClusterDialogProps {
  clusterId: string
  clusterName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeleteClusterDialog({
  clusterId,
  clusterName,
  open,
  onOpenChange,
  onSuccess,
}: DeleteClusterDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    try {
      setDeleting(true)
      const res = await fetch(`/api/archive/clusters/${clusterId}`, {
        method: 'DELETE',
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(
          data.error || 'Impossible de supprimer le dossier'
        )
        return
      }

      toast.success('Dossier supprimé avec succès')
      onSuccess?.()
      onOpenChange(false)
    } catch {
      toast.error('Erreur réseau lors de la suppression du dossier')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangleIcon className="size-5 shrink-0" />
            <DialogTitle>Supprimer le dossier</DialogTitle>
          </div>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer le dossier «{' '}
            <span className="font-semibold text-foreground">{clusterName}</span> » ?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive space-y-1">
          <p className="font-medium">Attention : action irréversible</p>
          <p className="text-muted-foreground">
            La suppression échouera si le dossier contient encore des documents ou sous-dossiers.
            Veuillez d'abord les déplacer ou les supprimer.
          </p>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Suppression...
              </>
            ) : (
              'Supprimer le dossier'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
