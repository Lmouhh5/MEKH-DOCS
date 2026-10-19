'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  PlusIcon,
  Trash2Icon,
  CalendarCheck2Icon,
  ClockIcon,
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

  // Form states
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
    <Card className={cn('border border-border/70 shadow-sm bg-card', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <CalendarCheck2Icon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Échéances Personnalisées
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rappels et alertes sur mesure configurés par l&apos;entreprise
            </p>
          </div>
        </div>

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
      </CardHeader>

      <CardContent className="pt-2">
        {manualDeadlines.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-border/60 bg-muted/10 text-muted-foreground">
            <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2">
              <ClockIcon className="size-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Aucune échéance personnalisée enregistrée
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Ajoutez vos propres rappels pour les audits, renouvellements de baux ou visites médicales.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenDialog}
              className="mt-4 gap-1.5"
            >
              <PlusIcon className="size-3.5" />
              Créer une échéance
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/50 rounded-lg border border-border/60 overflow-hidden bg-card">
            {manualDeadlines.map((item) => (
              <div
                key={item.id}
                data-testid={`manual-deadline-row-${item.id}`}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {item.label}
                  </span>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      Échéance : {formatDate(item.dueDate)}
                    </span>
                    <span>•</span>
                    <span>
                      Alertes à {item.yellowDaysBefore}j (jaune) et {item.redDaysBefore}j (rouge)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Badge variant="outline" className="text-[10px]">
                    Personnalisé
                  </Badge>
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
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2Icon className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal / Dialog de création d'échéance */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
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
                {submitting && <Loader2Icon className="size-4 animate-spin mr-1.5" />}
                Enregistrer l&apos;échéance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
