'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MachineForm, MachineData, MachineStatut } from '@/components/entities/machine-form'
import { EntityDocumentList } from '@/components/entities/entity-document-list'
import { DocumentSummary } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Wrench,
  PencilIcon,
  Trash2Icon,
  ArrowLeftIcon,
  Loader2Icon,
  PlusIcon,
  CalendarIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  FileCheck2Icon,
} from 'lucide-react'

interface MachineFullDetail extends MachineData {
  id: string
  machineId: string
  marque?: string | null
  modele?: string | null
  numeroSerie?: string | null
  matricule?: string | null
  statut: MachineStatut
  createdAt: string
  updatedAt: string
  documents: DocumentSummary[]
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getDueDateStatus(dueDateStr?: string | null) {
  if (!dueDateStr) return { status: 'MISSING', label: 'Non renseignée', color: 'text-muted-foreground' }
  const due = new Date(dueDateStr).getTime()
  const now = new Date().setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      status: 'EXPIRED',
      label: `Expiré (${Math.abs(diffDays)} j)`,
      color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    }
  }
  if (diffDays <= 7) {
    return {
      status: 'CRITICAL',
      label: `Expire dans ${diffDays} j`,
      color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    }
  }
  if (diffDays <= 30) {
    return {
      status: 'WARNING',
      label: `Expire dans ${diffDays} j`,
      color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    }
  }
  return {
    status: 'VALID',
    label: `Valide (${diffDays} j)`,
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  }
}

export default function MachineProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id as string) || ''

  const [machine, setMachine] = useState<MachineFullDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchMachine = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const res = await fetch(`/api/materiel/${id}`)
      if (res.status === 404) {
        toast.error('Matériel non trouvé')
        router.push('/materiel')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setMachine(data)
      } else {
        toast.error('Impossible de charger les données du matériel')
      }
    } catch (err) {
      console.error('Error fetching machine:', err)
      toast.error('Erreur lors du chargement du matériel')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchMachine()
  }, [fetchMachine])

  const handleDelete = async () => {
    if (!machine) return
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer la machine "${machine.machineId}" ? Tous ses documents associés seront également supprimés.`
    )
    if (!confirmed) return

    try {
      setIsDeleting(true)
      const res = await fetch(`/api/materiel/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Matériel supprimé avec succès')
        router.push('/materiel')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur de communication avec le serveur')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateSuccess = (updatedData: MachineData) => {
    setMachine((prev) => (prev ? { ...prev, ...updatedData } : null))
    setIsEditing(false)
  }

  const renderStatusBadge = (statut: MachineStatut) => {
    switch (statut) {
      case 'ACTIF':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-sm px-3 py-1 font-semibold"
          >
            Actif
          </Badge>
        )
      case 'EN_MAINTENANCE':
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-sm px-3 py-1 font-semibold"
          >
            En maintenance
          </Badge>
        )
      case 'HORS_SERVICE':
        return (
          <Badge
            variant="outline"
            className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-sm px-3 py-1 font-semibold"
          >
            Hors service
          </Badge>
        )
      default:
        return <Badge variant="outline">{statut}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2Icon className="size-8 animate-spin text-primary" />
        <p className="text-sm">Chargement de la fiche matériel...</p>
      </div>
    )
  }

  if (!machine) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Matériel introuvable</p>
        <Link
          href="/materiel"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4')}
        >
          Retour au parc matériel
        </Link>
      </div>
    )
  }

  const assuranceDocs = machine.documents.filter((d) => d.documentType === 'ASSURANCE')
  const controleDocs = machine.documents.filter((d) => d.documentType === 'CONTROLE_TECHNIQUE')

  const latestAssurance = assuranceDocs[0]
  const latestControle = controleDocs[0]

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 flex flex-col gap-8">
      {/* Top navigation */}
      <div className="flex flex-col gap-3">
        <Link
          href="/materiel"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Retour à la liste des matériels</span>
        </Link>

        {/* Header with Title, Status Badge and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Wrench className="size-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {machine.machineId}
                </h1>
                {renderStatusBadge(machine.statut)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[machine.marque, machine.modele].filter(Boolean).join(' ') || 'Engin lourd / véhicule'}
                {machine.matricule ? ` • Matricule: ${machine.matricule}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/materiel/${id}/nouveau-document`}
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-1.5')}
            >
              <PlusIcon className="size-4" />
              Nouveau document
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-1.5"
            >
              <PencilIcon className="size-3.5" />
              {isEditing ? 'Annuler' : 'Modifier'}
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              <Trash2Icon className="size-3.5" />
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </div>
        </div>
      </div>

      {/* Critical Legal Documents Alerts (Assurance & Contrôle Technique) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assurance Card */}
        <Card className={cn(
          'border',
          latestAssurance ? 'border-border/60' : 'border-amber-500/30 bg-amber-500/5'
        )}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-5 text-primary" />
              <CardTitle className="text-sm font-semibold">Assurance de l&apos;Engin</CardTitle>
            </div>
            {latestAssurance && (
              <Badge variant="outline" className={cn('text-xs font-medium', getDueDateStatus(latestAssurance.dueDate).color)}>
                {getDueDateStatus(latestAssurance.dueDate).label}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="text-xs">
            {latestAssurance ? (
              <div className="space-y-1.5">
                <div className="font-medium text-foreground truncate">{latestAssurance.title}</div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="size-3.5" />
                    Échéance: <strong className="text-foreground ml-1">{formatDate(latestAssurance.dueDate)}</strong>
                  </span>
                  <span>Émis le: {formatDate(latestAssurance.issueDate)}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 py-1">
                <AlertTriangleIcon className="size-4 shrink-0" />
                <span>Aucune police d&apos;assurance active enregistrée pour cet engin.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contrôle Technique Card */}
        <Card className={cn(
          'border',
          latestControle ? 'border-border/60' : 'border-amber-500/30 bg-amber-500/5'
        )}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <FileCheck2Icon className="size-5 text-primary" />
              <CardTitle className="text-sm font-semibold">Contrôle Technique</CardTitle>
            </div>
            {latestControle && (
              <Badge variant="outline" className={cn('text-xs font-medium', getDueDateStatus(latestControle.dueDate).color)}>
                {getDueDateStatus(latestControle.dueDate).label}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="text-xs">
            {latestControle ? (
              <div className="space-y-1.5">
                <div className="font-medium text-foreground truncate">{latestControle.title}</div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="size-3.5" />
                    Échéance: <strong className="text-foreground ml-1">{formatDate(latestControle.dueDate)}</strong>
                  </span>
                  <span>Émis le: {formatDate(latestControle.issueDate)}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 py-1">
                <AlertTriangleIcon className="size-4 shrink-0" />
                <span>Aucun contrôle technique enregistré pour cet engin.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Specifications / Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {isEditing ? 'Modifier les spécifications' : 'Spécifications & Identification'}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Mettez à jour les données techniques et d'immatriculation de l'engin."
              : 'Informations constructeur, numéros de série et statut opérationnel.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <MachineForm
              machine={machine}
              onSuccess={handleUpdateSuccess}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Identifiant / Code Interne
                </span>
                <span className="text-sm font-mono font-semibold text-foreground">
                  {machine.machineId}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Marque
                </span>
                <span className="text-sm text-foreground">
                  {machine.marque || 'Non renseignée'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Modèle
                </span>
                <span className="text-sm text-foreground">
                  {machine.modele || 'Non renseigné'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Numéro de série / Châssis (VIN)
                </span>
                <span className="text-sm font-mono text-foreground">
                  {machine.numeroSerie || 'Non renseigné'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Matricule / Immatriculation
                </span>
                <span className="text-sm font-mono text-foreground">
                  {machine.matricule || 'Non renseigné'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Statut Opérationnel
                </span>
                <div>{renderStatusBadge(machine.statut)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardContent className="pt-6">
          <EntityDocumentList
            module="MATERIEL"
            entityId={id}
            title="Documents de l'Engin"
            initialDocuments={machine.documents}
          />
        </CardContent>
      </Card>
    </div>
  )
}
