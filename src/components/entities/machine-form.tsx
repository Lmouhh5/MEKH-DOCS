'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export type MachineStatut = 'ACTIF' | 'EN_MAINTENANCE' | 'HORS_SERVICE'

export interface MachineData {
  id?: string
  machineId: string
  marque?: string | null
  modele?: string | null
  numeroSerie?: string | null
  matricule?: string | null
  statut?: MachineStatut
}

export interface MachineFormProps {
  machine?: MachineData
  onSuccess?: (machine: MachineData) => void
  onCancel?: () => void
}

export function MachineForm({ machine, onSuccess, onCancel }: MachineFormProps) {
  const isEdit = Boolean(machine?.id)
  const [machineId, setMachineId] = useState(machine?.machineId || '')
  const [marque, setMarque] = useState(machine?.marque || '')
  const [modele, setModele] = useState(machine?.modele || '')
  const [numeroSerie, setNumeroSerie] = useState(machine?.numeroSerie || '')
  const [matricule, setMatricule] = useState(machine?.matricule || '')
  const [statut, setStatut] = useState<MachineStatut>(machine?.statut || 'ACTIF')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!machineId.trim()) {
      toast.error("L'identifiant de la machine est requis")
      return
    }

    setIsSubmitting(true)

    try {
      const endpoint = isEdit ? `/api/materiel/${machine!.id}` : '/api/materiel'
      const method = isEdit ? 'PATCH' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: machineId.trim(),
          marque: isEdit ? (marque.trim() || null) : (marque.trim() || undefined),
          modele: isEdit ? (modele.trim() || null) : (modele.trim() || undefined),
          numeroSerie: isEdit ? (numeroSerie.trim() || null) : (numeroSerie.trim() || undefined),
          matricule: isEdit ? (matricule.trim() || null) : (matricule.trim() || undefined),
          statut,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Une erreur est survenue lors de l'enregistrement")
        return
      }

      toast.success(isEdit ? 'Matériel modifié avec succès' : 'Matériel créé avec succès')
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
        <Label htmlFor="machineId">
          Identifiant / Code Machine <span className="text-destructive">*</span>
        </Label>
        <Input
          id="machineId"
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          placeholder="ex. ENG-001"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="marque">Marque</Label>
          <Input
            id="marque"
            value={marque}
            onChange={(e) => setMarque(e.target.value)}
            placeholder="ex. Caterpillar"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="modele">Modèle</Label>
          <Input
            id="modele"
            value={modele}
            onChange={(e) => setModele(e.target.value)}
            placeholder="ex. 320D"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="numeroSerie">Numéro de série / Châssis (VIN)</Label>
          <Input
            id="numeroSerie"
            value={numeroSerie}
            onChange={(e) => setNumeroSerie(e.target.value)}
            placeholder="ex. CAT0320D123456"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="matricule">Matricule / Immatriculation</Label>
          <Input
            id="matricule"
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            placeholder="ex. 01234-116-16"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="statut">Statut</Label>
        <select
          id="statut"
          value={statut}
          onChange={(e) => setStatut(e.target.value as MachineStatut)}
          disabled={isSubmitting}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="ACTIF">Actif</option>
          <option value="EN_MAINTENANCE">En maintenance</option>
          <option value="HORS_SERVICE">Hors service</option>
        </select>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Enregistrement...'
            : isEdit
              ? 'Enregistrer les modifications'
              : 'Créer le matériel'}
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
