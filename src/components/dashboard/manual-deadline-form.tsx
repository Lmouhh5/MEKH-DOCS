'use client'

import React, { useState } from 'react'
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
import { RibbonEmpty, RibbonMetaChip, RibbonWidget } from '@/components/dashboard/ribbon-widget'
import { toast } from 'sonner'
import {
  PlusIcon,
  Trash2Icon,
  CalendarCheck2Icon,
  Loader2Icon,
} from 'lucide-react'

export interface ManualDeadlineItem {
  id: string
  label: string
  dueDate: Date | string
  yellowDaysBefore: number
  redDaysBefore: number
  createdAt?: Date | string
}

export interface ManualDeadlineFormProps {
  manualDeadlines?: ManualDeadlineItem[]
  onRefresh?: () => void
  className?: string
}

function formatDate(dateStr: Date | string) {
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ManualDeadlineForm({
  manualDeadlines = [],
  onRefresh,
  className,
}: ManualDeadlineFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [label, setLabel] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [yellowDaysBefore, setYellowDaysBefore] = useState('30')
  const [redDaysBefore, setRedDaysBefore] = useState('7')

  const resetForm = () => {
    setLabel('')
    setDueDate('')
    setYellowDaysBefore('30')
    setRedDaysBefore('7')
  }

  const handleOpenDialog = () => {
    resetForm()
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!label.trim()) {
      toast.error('Le libellé est requis')
      return
    }

    if (!dueDate) {
      toast.error("La date d'échéance est requise")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/dashboard/manual-deadlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: label.trim(),
          dueDate,
          yellowDaysBefore: Number(yellowDaysBefore) || 30,
          redDaysBefore: Number(redDaysBefore) || 7,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la création de l’échéance')
      }

      toast.success('Échéance ajoutée avec succès')
      setIsOpen(false)
      resetForm()
      onRefresh?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de création'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/dashboard/manual-deadlines/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }

      toast.success('Échéance supprimée')
      onRefresh?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de suppression'
      toast.error(msg)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <RibbonWidget
        index={3}
        className={className}
        title="Échéances Personnalisées"
        description="Rappels et alertes sur mesure configurés par l'entreprise"
        icon={<CalendarCheck2Icon className="size-4" />}
        action={
          <Button
            type="button"
            size="sm"
            onClick={handleOpenDialog}
            className="gap-1.5"
            data-testid="add-manual-deadline-btn"
          >
            <PlusIcon className="size-4" />
            Nouvelle échéance
          </Button>
        }
      >
        {manualDeadlines.length === 0 ? (
          <RibbonEmpty
            title="Aucune échéance personnalisée enregistrée"
            description="Ajoutez vos propres rappels pour les audits, renouvellements de baux ou visites médicales."
            meters={[
              { label: 'Rappels', level: 0 },
              { label: 'Audits', level: 0 },
              { label: 'Baux', level: 0 },
            ]}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenDialog}
                className="gap-1.5"
              >
                <PlusIcon className="size-3.5" />
                Créer une échéance
              </Button>
            }
          />
        ) : (
          <ul className="m-0 p-0 list-none">
            {manualDeadlines.map((item, i) => (
              <li
                key={item.id}
                data-testid={`manual-deadline-row-${item.id}`}
                className="ribbon-row ribbon-widget"
                style={{ ['--i' as string]: i }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-display font-medium text-sm text-ink truncate">
                      {item.label}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                      <span className="font-medium text-ink-2">
                        Échéance : {formatDate(item.dueDate)}
                      </span>
                      <span>
                        Alertes à {item.yellowDaysBefore}j (jaune) et {item.redDaysBefore}j (rouge)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <RibbonMetaChip>Personnalisé</RibbonMetaChip>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Supprimer ${item.label}`}
                      data-testid={`delete-manual-deadline-${item.id}`}
                    >
                      {deletingId === item.id ? (
                        <Loader2Icon className="size-3.5 motion-safe:animate-spin" />
                      ) : (
                        <Trash2Icon className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </RibbonWidget>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md ribbon-panel border-rule">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Ajouter une échéance personnalisée</DialogTitle>
              <DialogDescription>
                Définissez un rappel avec seuils d&apos;alerte préventifs pour votre équipe.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deadline-label">Libellé / Objet *</Label>
                <Input
                  id="deadline-label"
                  placeholder="Ex : Renouvellement permis d'exploitation, Audit..."
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deadline-date">Date d&apos;échéance *</Label>
                <Input
                  id="deadline-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="yellow-threshold">Alerte jaune (jours avant)</Label>
                  <Input
                    id="yellow-threshold"
                    type="number"
                    min="1"
                    value={yellowDaysBefore}
                    onChange={(e) => setYellowDaysBefore(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="red-threshold">Alerte rouge (jours avant)</Label>
                  <Input
                    id="red-threshold"
                    type="number"
                    min="1"
                    value={redDaysBefore}
                    onChange={(e) => setRedDaysBefore(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2Icon className="size-4 motion-safe:animate-spin mr-1.5" />}
                Enregistrer l&apos;échéance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
