'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export interface ClientData {
  id?: string
  nom: string
  nif?: string | null
  telephone?: string | null
  adresse?: string | null
}

export interface ClientFormProps {
  client?: ClientData
  onSuccess?: (client: ClientData) => void
  onCancel?: () => void
}

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const isEdit = Boolean(client?.id)
  const [nom, setNom] = useState(client?.nom || '')
  const [nif, setNif] = useState(client?.nif || '')
  const [telephone, setTelephone] = useState(client?.telephone || '')
  const [adresse, setAdresse] = useState(client?.adresse || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nom.trim()) {
      toast.error('Le nom est requis')
      return
    }

    setIsSubmitting(true)

    try {
      const endpoint = isEdit ? `/api/clients/${client!.id}` : '/api/clients'
      const method = isEdit ? 'PATCH' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: nom.trim(),
          nif: nif.trim() || undefined,
          telephone: telephone.trim() || undefined,
          adresse: adresse.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Une erreur est survenue lors de l'enregistrement")
        return
      }

      toast.success(isEdit ? 'Client modifié avec succès' : 'Client créé avec succès')
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
          Raison Sociale / Nom <span className="text-destructive">*</span>
        </Label>
        <Input
          id="nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="ex. SARL Batiment Nord"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nif">NIF (Numéro d&apos;Identification Fiscale)</Label>
        <Input
          id="nif"
          value={nif}
          onChange={(e) => setNif(e.target.value)}
          placeholder="ex. 000116001234567"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telephone">Téléphone</Label>
        <Input
          id="telephone"
          type="tel"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="ex. 0550 12 34 56"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adresse">Adresse</Label>
        <Input
          id="adresse"
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="ex. Zone Industrielle, Route de Rouiba, Alger"
          disabled={isSubmitting}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Enregistrement...'
            : isEdit
              ? 'Enregistrer les modifications'
              : 'Créer le client'}
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
