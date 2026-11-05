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
import { UploadCloudIcon, Loader2Icon, FileTextIcon } from 'lucide-react'
import { toast } from 'sonner'

export interface UploadArchiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clusterId: string
  clusterName?: string
  onSuccess?: (newDoc?: unknown) => void
}

export function UploadArchiveDialog({
  open,
  onOpenChange,
  clusterId,
  clusterName,
  onSuccess,
}: UploadArchiveDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [amount, setAmount] = useState('')
  const [physicalLocation, setPhysicalLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setFile(null)
      setTitle('')
      setIssueDate(new Date().toISOString().split('T')[0])
      setDueDate('')
      setAmount('')
      setPhysicalLocation('')
      setNotes('')
      setSubmitting(false)
    }
  }, [open])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null
    if (selected) {
      const isPdf =
        selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) {
        toast.error('Seuls les fichiers PDF sont acceptés')
        setFile(null)
        e.target.value = ''
        return
      }
      setFile(selected)
      if (!title) {
        // Pre-fill title from filename without extension
        const cleanName = selected.name.replace(/\.[^/.]+$/, '')
        setTitle(cleanName)
      }
    } else {
      setFile(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      toast.error('Veuillez sélectionner un fichier PDF')
      return
    }

    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      toast.error('Seuls les fichiers PDF sont acceptés')
      return
    }

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.error('Le titre du document est requis')
      return
    }

    if (!issueDate) {
      toast.error("La date d'émission est requise")
      return
    }

    try {
      setSubmitting(true)
      let res: Response

      // For files larger than 3.5MB, use direct presigned upload to bypass Vercel's 4.5MB limit
      const DIRECT_UPLOAD_THRESHOLD = 3.5 * 1024 * 1024
      if (file.size > DIRECT_UPLOAD_THRESHOLD) {
        // Step 1: Request presigned upload URL
        const uploadUrlRes = await fetch('/api/documents/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimetype: file.type || 'application/pdf',
            module: 'ARCHIVES',
            entityId: clusterId,
          }),
        })

        if (!uploadUrlRes.ok) {
          const errData = await uploadUrlRes.json().catch(() => ({}))
          throw new Error(errData?.error || "Impossible d'obtenir l'URL de téléversement sécurisée")
        }

        const { uploadUrl, fileKey } = await uploadUrlRes.json()

        // Step 2: Stream file directly to Cloudflare R2 / S3 via PUT
        const r2UploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/pdf',
          },
          body: file,
        })

        if (!r2UploadRes.ok) {
          throw new Error('Échec du téléversement direct vers Cloudflare R2. Vérifiez la configuration CORS.')
        }

        // Step 3: Save metadata with fileKey
        res = await fetch('/api/archive/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileKey,
            filename: file.name,
            mimetype: file.type || 'application/pdf',
            fileSize: file.size,
            title: trimmedTitle,
            archiveClusterId: clusterId,
            issueDate,
            dueDate: dueDate || null,
            amount: amount || null,
            physicalLocation: physicalLocation.trim() || null,
            notes: notes.trim() || null,
          }),
        })
      } else {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', trimmedTitle)
        formData.append('archiveClusterId', clusterId)
        formData.append('issueDate', issueDate)

        if (dueDate) {
          formData.append('dueDate', dueDate)
        }
        if (amount) {
          formData.append('amount', amount)
        }
        if (physicalLocation.trim()) {
          formData.append('physicalLocation', physicalLocation.trim())
        }
        if (notes.trim()) {
          formData.append('notes', notes.trim())
        }

        res = await fetch('/api/archive/documents', {
          method: 'POST',
          body: formData,
        })
      }

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors du téléversement')
        return
      }

      toast.success('Document téléversé avec succès')
      onSuccess?.(data)
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau lors du téléversement'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UploadCloudIcon className="size-5 text-primary" />
            <DialogTitle>Téléverser un document</DialogTitle>
          </div>
          <DialogDescription>
            {clusterName
              ? `Ajouter un nouveau document PDF dans le dossier « ${clusterName} »`
              : "Ajouter un nouveau document PDF dans les archives."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Fichier PDF */}
          <div className="space-y-1.5">
            <Label htmlFor="archive-upload-file">
              Fichier (PDF) <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="archive-upload-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                disabled={submitting}
                className="cursor-pointer file:cursor-pointer"
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <FileTextIcon className="size-3.5 text-primary" />
                <span className="font-medium text-foreground">{file.name}</span>
                <span>({(file.size / 1024).toFixed(1)} Ko)</span>
              </div>
            )}
          </div>

          {/* Titre */}
          <div className="space-y-1.5">
            <Label htmlFor="archive-upload-title">
              Titre du document <span className="text-destructive">*</span>
            </Label>
            <Input
              id="archive-upload-title"
              placeholder="Ex: Facture Sonelgaz Fév 2026, Contrat Maintenance..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Dates (Émission et Échéance) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="archive-upload-issue-date">
                Date d&apos;émission <span className="text-destructive">*</span>
              </Label>
              <Input
                id="archive-upload-issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="archive-upload-due-date">Date d&apos;échéance</Label>
              <Input
                id="archive-upload-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Montant et Emplacement physique */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="archive-upload-amount">Montant (DZD)</Label>
              <Input
                id="archive-upload-amount"
                type="number"
                step="any"
                min="0"
                placeholder="Ex: 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="archive-upload-location">Emplacement physique</Label>
              <Input
                id="archive-upload-location"
                placeholder="Ex: Armoire B, Rayon 3, Classeur 12"
                value={physicalLocation}
                onChange={(e) => setPhysicalLocation(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Notes / Références */}
          <div className="space-y-1.5">
            <Label htmlFor="archive-upload-notes">Notes / Références</Label>
            <Textarea
              id="archive-upload-notes"
              placeholder="Observations, références internes ou notes complémentaires..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
                  Téléversement...
                </>
              ) : (
                'Téléverser'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
