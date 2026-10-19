'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { DocumentDetailPanel } from '@/components/documents/document-detail-panel'
import { DocumentCard } from '@/components/documents/document-card'
import { DOCUMENT_TYPE_LABELS, DocumentTypeKey } from '@/lib/constants'
import { DocumentSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  FileTextIcon,
  PlusIcon,
  FilterIcon,
  Loader2Icon,
  AlertCircleIcon,
  Building2Icon,
  ShieldCheckIcon,
  LayersIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
} from 'lucide-react'

// Définition des groupes de types pour la fiscalité algérienne
const OBLIGATIONS_FISCALES_TYPES: DocumentTypeKey[] = [
  'G50',
  'G4',
  'G12',
  'G40',
  'ETAT_104',
  'REGISTRE_COMMERCE',
]

const ORGANISMES_SOCIAUX_TYPES: DocumentTypeKey[] = [
  'CNAS_DECLARATION',
  'CASNOS',
  'CACOBATPH',
]

const ALL_FISCALITE_ORDERED_TYPES: DocumentTypeKey[] = [
  ...OBLIGATIONS_FISCALES_TYPES,
  ...ORGANISMES_SOCIAUX_TYPES,
]

interface RawFiscaliteDoc {
  id: string
  title: string
  documentType: string
  module: string
  issueDate: string | Date
  dueDate?: string | Date | null
  amount?: number | string | null
  isPaid?: boolean | null
  entityName?: string
  createdAt?: string | Date
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-'
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

export default function FiscalitePage() {
  const [fiscaliteDocs, setFiscaliteDocs] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filtre de catégorie : 'ALL' | 'FISCAL' | 'SOCIAL'
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'FISCAL' | 'SOCIAL'>('ALL')
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)

  // Gestion des sections repliables (collapsibles)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const fetchFiscaliteDocs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/documents?module=FISCALITE')
      if (!res.ok) {
        throw new Error('Erreur lors du chargement des documents fiscaux')
      }
      const data = await res.json()
      const formatted: DocumentSummary[] = data.map((d: RawFiscaliteDoc) => ({
        id: d.id,
        title: d.title,
        documentType: d.documentType,
        module: d.module,
        issueDate:
          typeof d.issueDate === 'string'
            ? d.issueDate
            : new Date(d.issueDate).toISOString(),
        dueDate: d.dueDate
          ? typeof d.dueDate === 'string'
            ? d.dueDate
            : new Date(d.dueDate).toISOString()
          : undefined,
        amount: d.amount != null ? Number(d.amount) : undefined,
        isPaid: d.isPaid != null ? Boolean(d.isPaid) : undefined,
        entityName: d.entityName,
      }))
      setFiscaliteDocs(formatted)
    } catch {
      setError('Impossible de charger les documents fiscaux et sociaux')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchFiscaliteDocs()
  }, [fetchFiscaliteDocs])

  const toggleGroupCollapse = (typeKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [typeKey]: !prev[typeKey],
    }))
  }

  // Métriques de comptage
  const fiscalCount = useMemo(() => {
    return fiscaliteDocs.filter((d) =>
      OBLIGATIONS_FISCALES_TYPES.includes(d.documentType as DocumentTypeKey)
    ).length
  }, [fiscaliteDocs])

  const socialCount = useMemo(() => {
    return fiscaliteDocs.filter((d) =>
      ORGANISMES_SOCIAUX_TYPES.includes(d.documentType as DocumentTypeKey)
    ).length
  }, [fiscaliteDocs])

  // Regroupement des documents par type de document
  const groupedDocuments = useMemo(() => {
    // Collecter tous les types distincts présents dans les documents, ordonnés selon ALL_FISCALITE_ORDERED_TYPES
    const typesPresent = new Set(fiscaliteDocs.map((d) => d.documentType))
    const orderedKeys = [
      ...ALL_FISCALITE_ORDERED_TYPES.filter((t) => typesPresent.has(t)),
      ...Array.from(typesPresent).filter(
        (t) => !ALL_FISCALITE_ORDERED_TYPES.includes(t as DocumentTypeKey)
      ),
    ]

    return orderedKeys
      .map((typeKey) => {
        const isFiscal = OBLIGATIONS_FISCALES_TYPES.includes(typeKey as DocumentTypeKey)
        const isSocial = ORGANISMES_SOCIAUX_TYPES.includes(typeKey as DocumentTypeKey)
        const category: 'FISCAL' | 'SOCIAL' | 'OTHER' = isFiscal
          ? 'FISCAL'
          : isSocial
          ? 'SOCIAL'
          : 'OTHER'

        const docs = fiscaliteDocs
          .filter((d) => d.documentType === typeKey)
          .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())

        // Trouver la date de la dernière déclaration
        let latestDate: string | null = null
        if (docs.length > 0) {
          latestDate = formatDate(docs[0].issueDate)
        }

        const label =
          DOCUMENT_TYPE_LABELS[typeKey as DocumentTypeKey] || typeKey

        return {
          typeKey,
          label,
          category,
          documents: docs,
          latestDate,
        }
      })
      .filter((group) => {
        if (selectedCategory === 'ALL') return true
        if (selectedCategory === 'FISCAL') return group.category === 'FISCAL'
        if (selectedCategory === 'SOCIAL') return group.category === 'SOCIAL'
        return true
      })
  }, [fiscaliteDocs, selectedCategory])

  const distinctTypesCount = useMemo(() => {
    return new Set(fiscaliteDocs.map((d) => d.documentType)).size
  }, [fiscaliteDocs])

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col gap-8">
      {/* En-tête principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <FileTextIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Fiscalité & Déclarations Administratives
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Coffre-fort numérique des déclarations fiscales algériennes (G50, G4, État 104) et cotisations sociales (CNAS, CASNOS, CACOBATPH).
            </p>
          </div>
        </div>

        <Link
          href="/fiscalite/nouveau-document"
          className={cn(buttonVariants({ variant: 'default' }), 'gap-1.5')}
        >
          <PlusIcon className="size-4" />
          Nouveau document fiscal / social
        </Link>
      </div>

      {/* Cartes métriques récapitulatives */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Documents */}
        <Card className="border border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Déclarations
            </CardTitle>
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <LayersIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {fiscaliteDocs.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-foreground">{distinctTypesCount}</span> catégorie{distinctTypesCount > 1 ? 's' : ''} archivée{distinctTypesCount > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Obligations Fiscales */}
        <Card className="border border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Obligations Fiscales
            </CardTitle>
            <div className="p-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2Icon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {fiscalCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              G50, G4, G12, G40, État 104, RC
            </p>
          </CardContent>
        </Card>

        {/* Organismes Sociaux */}
        <Card className="border border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Organismes Sociaux
            </CardTitle>
            <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheckIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {socialCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              CNAS, CASNOS, CACOBATPH
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section Principale: Archive documentaire par type */}
      <section aria-labelledby="archive-heading" className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border/50 pt-6">
          <div>
            <h2 id="archive-heading" className="text-lg font-bold tracking-tight text-foreground">
              Archives Fiscales & Déclaratives
            </h2>
            <p className="text-xs text-muted-foreground">
              Documents regroupés par nature de déclaration avec date du dernier dépôt.
            </p>
          </div>

          {/* Filtre par catégorie (Tous / Obligations Fiscales / Organismes Sociaux) */}
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/60 self-start sm:self-auto">
            <FilterIcon className="size-3.5 text-muted-foreground ml-1.5 shrink-0" />
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                selectedCategory === 'ALL'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Tous ({fiscaliteDocs.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('FISCAL')}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                selectedCategory === 'FISCAL'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Obligations Fiscales ({fiscalCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('SOCIAL')}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                selectedCategory === 'SOCIAL'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Organismes Sociaux ({socialCount})
            </button>
          </div>
        </div>

        {/* État de chargement */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3 border rounded-lg bg-card/40">
            <Loader2Icon className="size-7 animate-spin text-primary" />
            <p className="text-xs">Chargement des documents fiscaux & sociaux...</p>
          </div>
        ) : error ? (
          <div className="p-6 flex items-center justify-center gap-2 text-xs text-destructive border border-dashed rounded-lg bg-destructive/5">
            <AlertCircleIcon className="size-4" />
            <span>{error}</span>
          </div>
        ) : fiscaliteDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg bg-muted/10 text-muted-foreground my-2">
            <div className="p-3 rounded-full bg-muted/40 mb-3 text-muted-foreground/80">
              <FileTextIcon className="size-6" />
            </div>
            <p className="text-sm font-medium">Aucun document fiscal ou social enregistré</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-md">
              Téléversez vos déclarations G50, liasses fiscales, attestations de mise à jour CNAS ou registres de commerce.
            </p>
            <Link
              href="/fiscalite/nouveau-document"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4 gap-1.5')}
            >
              <PlusIcon className="size-3.5" />
              Ajouter un premier document
            </Link>
          </div>
        ) : groupedDocuments.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-lg bg-muted/10 text-muted-foreground">
            <p className="text-sm font-medium">Aucun document dans cette catégorie</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Aucun document ne correspond au filtre sélectionné.
            </p>
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className="mt-3 text-xs text-primary font-medium hover:underline"
            >
              Réinitialiser le filtre
            </button>
          </div>
        ) : (
          /* Liste des groupes de documents */
          <div className="flex flex-col gap-6">
            {groupedDocuments.map((group) => {
              const isCollapsed = Boolean(collapsedGroups[group.typeKey])
              const isFiscal = group.category === 'FISCAL'

              return (
                <div
                  key={group.typeKey}
                  data-testid={`group-section-${group.typeKey}`}
                  className="rounded-lg border border-border/70 bg-card overflow-hidden shadow-sm"
                >
                  {/* En-tête du groupe (collapsible) */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleGroupCollapse(group.typeKey)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleGroupCollapse(group.typeKey)
                      }
                    }}
                    className="p-4 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg shrink-0',
                          isFiscal
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        {isFiscal ? (
                          <Building2Icon className="size-4" />
                        ) : (
                          <ShieldCheckIcon className="size-4" />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">
                          {group.label}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] font-semibold tracking-wide',
                            isFiscal
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                          )}
                        >
                          {group.documents.length}{' '}
                          {group.documents.length > 1 ? 'documents' : 'document'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground self-end sm:self-auto">
                      {group.latestDate && (
                        <div className="flex items-center gap-1.5 font-medium">
                          <CalendarIcon className="size-3.5 text-muted-foreground" />
                          <span>Dernière déclaration : {group.latestDate}</span>
                        </div>
                      )}

                      <div className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                        {isCollapsed ? (
                          <ChevronDownIcon className="size-4" aria-label="Déplier" />
                        ) : (
                          <ChevronUpIcon className="size-4" aria-label="Replier" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contenu du groupe : cartes des documents */}
                  {!isCollapsed && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border/40 bg-background/50">
                      {group.documents.map((doc) => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          onSelect={(id) => setSelectedDocumentId(id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Panneau latéral de détails du document */}
      <DocumentDetailPanel
        documentId={selectedDocumentId}
        isOpen={Boolean(selectedDocumentId)}
        onClose={() => setSelectedDocumentId(null)}
        onDocumentUpdated={() => {
          void fetchFiscaliteDocs()
        }}
      />
    </div>
  )
}
