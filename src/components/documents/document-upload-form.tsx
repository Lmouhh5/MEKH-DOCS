'use client'

import React, { useState, useRef } from 'react'
import {
  DOCUMENT_TYPES_BY_MODULE,
  DOCUMENT_TYPE_LABELS,
  DocumentTypeKey,
  ModuleKey,
} from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export interface DocumentUploadFormProps {
  module: ModuleKey
  entityId: string | null
  onSuccess: () => void
}

export function DocumentUploadForm({
  module,
  entityId,
  onSuccess,
}: DocumentUploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState<string>('')
  const [issueDate, setIssueDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [amount, setAmount] = useState('')
  const [physicalLocation, setPhysicalLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const allowedTypes = (DOCUMENT_TYPES_BY_MODULE[module] || []) as DocumentTypeKey[]
  const isDueDateRequired =
    documentType === 'ASSURANCE' || documentType === 'CONTROLE_TECHNIQUE'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      toast.error('Veuillez sélectionner un fichier PDF')
      return
    }
    if (!title.trim()) {
      toast.error('Le titre est requis')
      return
    }
    if (!documentType) {
      toast.error('Le type de document est requis')
      return
    }
    if (!issueDate) {
      toast.error("La date d'émission est requise")
      return
    }
    if (isDueDateRequired && !dueDate) {
      toast.error("La date d'échéance est requise pour ce type de document")
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title.trim())
      formData.append('module', module)
      formData.append('documentType', documentType)
      formData.append('issueDate', issueDate)
      if (dueDate) formData.append('dueDate', dueDate)
      if (amount) formData.append('amount', amount)
      if (physicalLocation.trim()) {
        formData.append('physicalLocation', physicalLocation.trim())
      }
      if (notes.trim()) {
        formData.append('notes', notes.trim())
      }
      if (entityId) {
        formData.append('entityId', entityId)
      }

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        let errorMsg = 'Erreur lors du téléversement du document'
        try {
          const errData = await res.json()
          if (errData?.error) {
            errorMsg = errData.error
          }
        } catch {
          // ignore parsing error
        }
        toast.error(errorMsg)
        return
      }

      toast.success('Document téléversé avec succès')
      setFile(null)
      setTitle('')
      setDocumentType('')
      setIssueDate('')
      setDueDate('')
      setAmount('')
      setPhysicalLocation('')
      setNotes('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onSuccess()
    } catch {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Téléverser un document" className="flex flex-col gap-4">
      {/* Fichier PDF */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file">Fichier (PDF uniquement) *</Label>
        <Input
          ref={fileInputRef}
          id="file"
          name="file"
          type="file"
          accept=".pdf"
          required
          onChange={handleFileChange}
        />
      </div>

      {/* Titre */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Titre *</Label>
        <Input
          id="title"
          name="title"
          type="text"
          placeholder="Ex: Facture #2026-001"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Type de document */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="documentType">Type de document *</Label>
        <select
          id="documentType"
          name="documentType"
          required
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
        >
          <option value="">Sélectionner un type...</option>
          {allowedTypes.map((typeKey) => (
            <option key={typeKey} value={typeKey}>
              {DOCUMENT_TYPE_LABELS[typeKey] || typeKey}
            </option>
          ))}
        </select>
      </div>

      {/* Dates: Émission & Échéance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="issueDate">{"Date d'émission *"}</Label>
          <Input
            id="issueDate"
            name="issueDate"
            type="date"
            required
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dueDate">
            {"Date d'échéance / Date d'expiration "}{isDueDateRequired && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            required={isDueDateRequired}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      {/* Montant & Emplacement */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Montant (DZD)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="physicalLocation">Emplacement physique</Label>
          <Input
            id="physicalLocation"
            name="physicalLocation"
            type="text"
            placeholder="Ex: Classeur A, Boîte 3"
            value={physicalLocation}
            onChange={(e) => setPhysicalLocation(e.target.value)}
          />
        </div>
      </div>

      {/* Notes / Observations */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes / Observations</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Remarques éventuelles sur ce document..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? 'Téléversement en cours...' : 'Téléverser le document'}
      </Button>
    </form>
  )
}
