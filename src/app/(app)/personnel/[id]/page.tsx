'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { WorkerForm, WorkerData } from '@/components/entities/worker-form'
import { EntityDocumentList } from '@/components/entities/entity-document-list'
import { DocumentDetailPanel } from '@/components/documents/document-detail-panel'
import { DocumentSummary } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  UserCheckIcon,
  CalendarIcon,
  PencilIcon,
  Trash2Icon,
  ArrowLeftIcon,
  Loader2Icon,
  PlusIcon,
  HashIcon,
  ShieldCheckIcon,
  FileTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  BanknoteIcon,
  FolderOpenIcon,
} from 'lucide-react'

interface WorkerFullDetail extends WorkerData {
  id: string
  nom: string
  numeroIdentification?: string | null
  dateDebutContrat?: string | null
  numeroCnas?: string | null
  createdAt: string
  updatedAt: string
  documents: DocumentSummary[]
}

interface PaySlipMonthGroup {
  key: string
  label: string
  sortKey: string
  documents: DocumentSummary[]
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return 'Non renseignée'
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

function formatMonthYear(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Date inconnue'
    const raw = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  } catch {
    return dateStr
  }
}

function formatAmount(amount?: number | null) {
  if (amount === undefined || amount === null) return null
  return `${Number(amount).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DZD`
}

export default function WorkerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id as string) || ''

  const [worker, setWorker] = useState<WorkerFullDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({})

  const fetchWorker = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const res = await fetch(`/api/personnel/${id}`)
      if (res.status === 404) {
        toast.error('Employé non trouvé')
        router.push('/personnel')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setWorker(data)
      } else {
        toast.error("Impossible de charger les données de l'employé")
      }
    } catch (err) {
      console.error('Error fetching worker:', err)
      toast.error("Erreur lors du chargement de l'employé")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchWorker()
  }, [fetchWorker])

  const handleDelete = async () => {
    if (!worker) return
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer l'employé "${worker.nom}" ? Cette action supprimera également tous ses documents associés.`
    )
    if (!confirmed) return

    try {
      setIsDeleting(true)
      const res = await fetch(`/api/personnel/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Employé supprimé avec succès')
        router.push('/personnel')
      } else {
        const data = await res.json()
        toast.error(data.error || "Erreur lors de la suppression de l'employé")
      }
    } catch {
      toast.error('Erreur de communication avec le serveur')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateSuccess = (updatedData: WorkerData) => {
    setWorker((prev) => (prev ? { ...prev, ...updatedData } : null))
    setIsEditing(false)
    fetchWorker()
  }

  const toggleMonthCollapse = (monthKey: string) => {
    setCollapsedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }))
  }

  // Fiches de paie grouped by month/year using Array.prototype.reduce
  const { groupedPaySlips, otherDocuments } = useMemo(() => {
    if (!worker?.documents) {
      return { groupedPaySlips: [], otherDocuments: [] }
    }

    const paySlips = worker.documents.filter((d) => d.documentType === 'FICHE_DE_PAIE')
    const others = worker.documents.filter((d) => d.documentType !== 'FICHE_DE_PAIE')

    const groupsRecord = paySlips.reduce<Record<string, PaySlipMonthGroup>>((acc, doc) => {
      const d = new Date(doc.issueDate)
      const isValid = !isNaN(d.getTime())
      const sortKey = isValid
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : '0000-00'
      const label = isValid ? formatMonthYear(doc.issueDate) : 'Date indéterminée'

      if (!acc[sortKey]) {
        acc[sortKey] = {
          key: sortKey,
          label,
          sortKey,
          documents: [],
        }
      }
      acc[sortKey].documents.push(doc)
      return acc
    }, {})

    const sortedGroups = Object.values(groupsRecord).sort((a, b) =>
      b.sortKey.localeCompare(a.sortKey)
    )

    return {
      groupedPaySlips: sortedGroups,
      otherDocuments: others,
    }
  }, [worker])

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2Icon className="size-8 motion-safe:animate-spin text-primary" />
        <p className="text-sm">Chargement du profil employé...</p>
      </div>
    )
  }

  if (!worker) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Employé introuvable</p>
        <Link
          href="/personnel"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4')}
        >
          Retour au personnel
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 flex flex-col gap-8">
      {/* Top navigation */}
      <div className="flex flex-col gap-3">
        <Link
          href="/personnel"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Retour à la liste du personnel</span>
        </Link>

        {/* Header with Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <UserCheckIcon className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {worker.nom}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dossier employé &bull; Fiches de paie et documents administratifs RH
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/personnel/${id}/nouveau-document`}
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

      {/* Profile Details Card / Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {isEditing ? "Modifier les informations de l'employé" : 'Informations Administratives & Contrat'}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Mettez à jour les coordonnées et identifiants RH de l'employé ci-dessous."
              : "Identité de l'employé, numéro d'affiliation CNAS et début de contrat."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <WorkerForm
              worker={worker}
              onSuccess={handleUpdateSuccess}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <UserCheckIcon className="size-3.5" />
                  Nom et Prénom
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {worker.nom}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <HashIcon className="size-3.5" />
                  Numéro d&apos;Identification (CIN)
                </span>
                <span className="text-sm font-mono text-foreground">
                  {worker.numeroIdentification || 'Non renseigné'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheckIcon className="size-3.5" />
                  Numéro CNAS
                </span>
                <span className="text-sm font-mono text-foreground">
                  {worker.numeroCnas || 'Non renseigné'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5" />
                  Date de Début de Contrat
                </span>
                <span className="text-sm text-foreground">
                  {formatDate(worker.dateDebutContrat)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fiches de Paie - Month/Year Grouping (Step 5) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <BanknoteIcon className="size-5 text-primary" />
              <span>Fiches de Paie</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historique des bulletins de paie groupés par mois d&apos;émission.
            </p>
          </div>

          <Link
            href={`/personnel/${id}/nouveau-document`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <PlusIcon className="size-3.5" />
            Ajouter une fiche de paie
          </Link>
        </div>

        {groupedPaySlips.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <div className="p-3 rounded-full bg-muted/50 mb-2 text-muted-foreground">
                <FileTextIcon className="size-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Aucune fiche de paie enregistrée
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mb-3">
                Téléversez les bulletins de salaire mensuels pour suivre la rémunération de cet employé.
              </p>
              <Link
                href={`/personnel/${id}/nouveau-document`}
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'gap-1.5')}
              >
                <PlusIcon className="size-3.5" />
                Téléverser une fiche de paie
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {groupedPaySlips.map((group) => {
              const isCollapsed = collapsedMonths[group.key] ?? false
              return (
                <div
                  key={group.key}
                  className="rounded-lg border border-border bg-card overflow-hidden shadow-sm"
                >
                  {/* Collapsible Month Header */}
                  <button
                    type="button"
                    onClick={() => toggleMonthCollapse(group.key)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    aria-expanded={!isCollapsed}
                  >
                    <div className="flex items-center gap-2.5">
                      {isCollapsed ? (
                        <ChevronRightIcon className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDownIcon className="size-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold text-sm text-foreground">
                        {group.label}
                      </span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {group.documents.length} bulletin{group.documents.length > 1 ? 's' : ''}
                      </Badge>
                    </div>

                    <span className="text-xs text-muted-foreground">
                      {isCollapsed ? 'Afficher' : 'Réduire'}
                    </span>
                  </button>

                  {/* Month Pay Slips List */}
                  {!isCollapsed && (
                    <div className="divide-y divide-border/60">
                      {group.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 hover:bg-muted/20 transition-colors gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded bg-primary/10 text-primary shrink-0 mt-0.5">
                              <FileTextIcon className="size-4" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium text-foreground">
                                {doc.title}
                              </span>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="size-3 text-muted-foreground/70" />
                                  Émis le {formatDate(doc.issueDate)}
                                </span>
                                {doc.amount != null && (
                                  <span className="flex items-center gap-1 font-semibold text-foreground">
                                    <BanknoteIcon className="size-3 text-muted-foreground/70" />
                                    {formatAmount(doc.amount)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedDocId(doc.id)}
                              className="gap-1.5 text-xs h-8"
                            >
                              <EyeIcon className="size-3.5" />
                              Aperçu
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Autres Documents RH Section (Contracts, ID cards, etc.) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpenIcon className="size-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Autres Documents RH
            </h2>
          </div>
          <EntityDocumentList
            module="PERSONNEL"
            entityId={id}
            title="Autres Documents RH"
            initialDocuments={otherDocuments}
            uploadHref={`/personnel/${id}/nouveau-document`}
          />
        </CardContent>
      </Card>

      {/* Document Detail Preview Panel for Fiches de paie preview */}
      <DocumentDetailPanel
        documentId={selectedDocId}
        isOpen={Boolean(selectedDocId)}
        onClose={() => setSelectedDocId(null)}
        onDocumentUpdated={fetchWorker}
      />
    </div>
  )
}
