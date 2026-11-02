'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FolderPlusIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

export interface CreateClusterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentId?: string | null
  parentName?: string | null
  onSuccess?: (cluster?: any) => void
  onSubmit?: (data: { name: string; description: string; parentId?: string | null }) => void | Promise<void>
}

export function CreateClusterDialog({
  open,
  onOpenChange,
  parentId,
  parentName,
  onSuccess,
  onSubmit,
}: CreateClusterDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setSubmitting(false)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      toast.error('Le nom du dossier est requis')
      return
    }

    if (onSubmit) {
      try {
        const result = onSubmit({
          name: trimmedName,
          description: description.trim(),
          ...(parentId ? { parentId } : {}),
        })
        if (result instanceof Promise) {
          setSubmitting(true)
          await result
          setSubmitting(false)
        }
        onOpenChange(false)
      } catch (err: any) {
        setSubmitting(false)
        toast.error(err?.message || 'Erreur lors de la création du dossier')
      }
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/archive/clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
          parentId: parentId || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la création du dossier')
        return
      }

      toast.success('Dossier créé avec succès')
      onSuccess?.(data)
      onOpenChange(false)
    } catch {
      toast.error('Erreur réseau lors de la création du dossier')
    } finally {
      setSubmitting(false)
    }
  }

  const isSubFolder = Boolean(parentId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FolderPlusIcon className="size-5 text-primary" />
            <DialogTitle>
              {isSubFolder ? 'Nouveau Sous-Dossier' : 'Nouveau Dossier'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isSubFolder && parentName
              ? `Créer un nouveau sous-dossier dans : ${parentName}`
              : "Créer un nouveau dossier d'archives pour organiser vos documents."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cluster-name">
              Nom du dossier <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cluster-name"
              placeholder="Ex: Marchés 2026, Factures Fournisseurs..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cluster-description">Description</Label>
            <Textarea
              id="cluster-description"
              placeholder="Description facultative du dossier..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer le dossier'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
