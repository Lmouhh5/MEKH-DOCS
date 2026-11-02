'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { DocumentDetailPanel } from '@/components/documents/document-detail-panel'
import { DocumentCard } from '@/components/documents/document-card'
import {
  RibbonEmpty,
  RibbonKpiStrip,
  RibbonMetaChip,
  RibbonSeg,
  RibbonSegButton,
  RibbonWidget,
} from '@/components/dashboard/ribbon-widget'
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
    <div className="mx-auto max-w-7xl flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-rule pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink">
            Fiscalité & Déclarations Administratives
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Coffre-fort numérique des déclarations fiscales algériennes (G50, G4, État 104) et cotisations sociales (CNAS, CASNOS, CACOBATPH).
          </p>
        </div>

        <Link
          href="/fiscalite/nouveau-document"
          className={cn(buttonVariants({ variant: 'default' }), 'gap-1.5')}
        >
          <PlusIcon className="size-4" />
          Nouveau document fiscal / social
        </Link>
      </div>

      <RibbonKpiStrip
        items={[
          {
            label: 'Total Déclarations',
            value: fiscaliteDocs.length,
            icon: <LayersIcon className="size-4" />,
            hint: (
              <>
                <span className="font-medium text-ink tabular-nums">{distinctTypesCount}</span>{' '}
                catégorie{distinctTypesCount > 1 ? 's' : ''} archivée
                {distinctTypesCount > 1 ? 's' : ''}
              </>
            ),
          },
          {
            label: 'Obligations Fiscales',
            value: fiscalCount,
            icon: <Building2Icon className="size-4" />,
            hint: 'G50, G4, G12, G40, État 104, RC',
          },
          {
            label: 'Organismes Sociaux',
            value: socialCount,
            icon: <ShieldCheckIcon className="size-4" />,
            hint: 'CNAS, CASNOS, CACOBATPH',
          },
        ]}
      />

      <RibbonWidget
        index={1}
        title="Archives Fiscales & Déclaratives"
        description="Documents regroupés par nature de déclaration avec date du dernier dépôt."
        icon={<FileTextIcon className="size-4" />}
        action={
          <RibbonSeg>
            <FilterIcon className="size-3.5 text-muted-foreground ml-2 shrink-0" />
            <RibbonSegButton
              active={selectedCategory === 'ALL'}
              onClick={() => setSelectedCategory('ALL')}
            >
              Tous ({fiscaliteDocs.length})
            </RibbonSegButton>
            <RibbonSegButton
              active={selectedCategory === 'FISCAL'}
              onClick={() => setSelectedCategory('FISCAL')}
            >
              Obligations Fiscales ({fiscalCount})
            </RibbonSegButton>
            <RibbonSegButton
              active={selectedCategory === 'SOCIAL'}
              onClick={() => setSelectedCategory('SOCIAL')}
            >
              Organismes Sociaux ({socialCount})
            </RibbonSegButton>
          </RibbonSeg>
        }
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
            <Loader2Icon className="size-7 motion-safe:animate-spin text-primary" />
            <p className="text-sm">Chargement des documents fiscaux & sociaux…</p>
          </div>
        ) : error ? (
          <div className="p-6 flex items-center justify-center gap-2 text-sm text-destructive">
            <AlertCircleIcon className="size-4" />
            <span>{error}</span>
          </div>
        ) : fiscaliteDocs.length === 0 ? (
          <RibbonEmpty
            title="Aucun document fiscal ou social enregistré"
            description="Téléversez vos déclarations G50, liasses fiscales, attestations de mise à jour CNAS ou registres de commerce."
            meters={[
              { label: 'Fiscal', level: 0 },
              { label: 'Social', level: 0 },
              { label: 'Archive', level: 0 },
            ]}
            action={
              <Link
                href="/fiscalite/nouveau-document"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
              >
                <PlusIcon className="size-3.5" />
                Ajouter un premier document
              </Link>
            }
          />
        ) : groupedDocuments.length === 0 ? (
          <RibbonEmpty
            title="Aucun document dans cette catégorie"
            description="Aucun document ne correspond au filtre sélectionné."
            meters={[
              { label: 'Filtre', level: 0 },
              { label: 'Types', level: 0 },
              { label: 'Dossiers', level: 0 },
            ]}
            action={
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className="text-[13px] text-primary font-medium hover:underline active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-part"
              >
                Réinitialiser le filtre
              </button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {groupedDocuments.map((group, i) => {
              const isCollapsed = Boolean(collapsedGroups[group.typeKey])
              const isFiscal = group.category === 'FISCAL'

              return (
                <div
                  key={group.typeKey}
                  data-testid={`group-section-${group.typeKey}`}
                  className="ribbon-part overflow-hidden ribbon-widget"
                  style={{ ['--i' as string]: i }}
                >
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
                    className="p-4 hover:bg-paper-3/40 active:translate-y-px transition-colors duration-micro cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <div className="flex items-center gap-3">
                      <div className="ribbon-part size-9 shrink-0 flex items-center justify-center text-primary">
                        {isFiscal ? (
                          <Building2Icon className="size-4" />
                        ) : (
                          <ShieldCheckIcon className="size-4" />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-sm font-medium text-ink tracking-tight max-w-none">
                          {group.label}
                        </h3>
                        <RibbonMetaChip lit>
                          {group.documents.length}{' '}
                          {group.documents.length > 1 ? 'documents' : 'document'}
                        </RibbonMetaChip>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[13px] text-muted-foreground self-end sm:self-auto">
                      {group.latestDate && (
                        <div className="flex items-center gap-1.5 font-medium">
                          <CalendarIcon className="size-3.5 text-muted-foreground" />
                          <span>Dernière déclaration : {group.latestDate}</span>
                        </div>
                      )}

                      <div className="p-1 rounded-part text-muted-foreground">
                        {isCollapsed ? (
                          <ChevronDownIcon className="size-4" aria-label="Déplier" />
                        ) : (
                          <ChevronUpIcon className="size-4" aria-label="Replier" />
                        )}
                      </div>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-rule">
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
      </RibbonWidget>

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
