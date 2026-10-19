'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export interface WorkerData {
  id?: string
  nom: string
  numeroIdentification?: string | null
  dateDebutContrat?: string | null
  numeroCnas?: string | null
}

export interface WorkerFormProps {
  worker?: WorkerData
  onSuccess?: (worker: WorkerData) => void
  onCancel?: () => void
}

function formatDateForInput(dateVal?: string | null): string {
  if (!dateVal) return ''
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return dateVal.slice(0, 10)
    return d.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

export function WorkerForm({ worker, onSuccess, onCancel }: WorkerFormProps) {
  const isEdit = Boolean(worker?.id)
  const [nom, setNom] = useState(worker?.nom || '')
  const [numeroIdentification, setNumeroIdentification] = useState(
    worker?.numeroIdentification || ''
  )
  const [numeroCnas, setNumeroCnas] = useState(worker?.numeroCnas || '')
  const [dateDebutContrat, setDateDebutContrat] = useState(
    formatDateForInput(worker?.dateDebutContrat)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nom.trim()) {
      toast.error('Le nom est requis')
      return
    }

    setIsSubmitting(true)

    try {
      const endpoint = isEdit ? `/api/personnel/${worker!.id}` : '/api/personnel'
      const method = isEdit ? 'PATCH' : 'POST'

      const bodyPayload = isEdit
        ? {
            nom: nom.trim(),
            numeroIdentification: numeroIdentification.trim() ? numeroIdentification.trim() : null,
            numeroCnas: numeroCnas.trim() ? numeroCnas.trim() : null,
            dateDebutContrat: dateDebutContrat ? dateDebutContrat : null,
          }
        : {
            nom: nom.trim(),
            numeroIdentification: numeroIdentification.trim() || undefined,
            numeroCnas: numeroCnas.trim() || undefined,
            dateDebutContrat: dateDebutContrat || undefined,
          }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Une erreur est survenue lors de l'enregistrement")
        return
      }

      toast.success(isEdit ? 'Employé modifié avec succès' : 'Employé créé avec succès')
      onSuccess?.(data)
    } catch {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div className="space-y-1.5">
        <Label htmlFor="nom">
          Nom et Prénom de l&apos;Employé <span className="text-destructive">*</span>
        </Label>
        <Input
          id="nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="ex. Mohamed Benali"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="numeroIdentification">
          Numéro d&apos;Identification (CIN / Matricule)
        </Label>
        <Input
          id="numeroIdentification"
          value={numeroIdentification}
          onChange={(e) => setNumeroIdentification(e.target.value)}
          placeholder="ex. 109283745 / MAT-2024-01"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="numeroCnas">Numéro CNAS</Label>
        <Input
          id="numeroCnas"
          value={numeroCnas}
          onChange={(e) => setNumeroCnas(e.target.value)}
          placeholder="ex. 84 1234 5678 90"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dateDebutContrat">Date de Début de Contrat</Label>
        <Input
          id="dateDebutContrat"
          type="date"
          value={dateDebutContrat}
          onChange={(e) => setDateDebutContrat(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Enregistrement...'
            : isEdit
              ? 'Enregistrer les modifications'
              : "Créer l'employé"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
        )}
      </div>
    </form>
  )
}
