'use client'

import React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { DOCUMENT_TYPE_LABELS, MODULE_LABELS, DocumentTypeKey, ModuleKey } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RotateCcwIcon, FilterIcon } from 'lucide-react'

export interface SearchFiltersProps {
  className?: string
}

export function SearchFilters({ className = '' }: SearchFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedType = searchParams.get('type') ?? ''
  const selectedModule = searchParams.get('module') ?? ''
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const handleReset = () => {
    router.replace(pathname)
  }

  return (
    <div
      className={`bg-card/60 border border-border/60 rounded-xl p-4 shadow-xs flex flex-col gap-4 ${className}`}
      role="region"
      aria-label="Filtres de recherche"
    >
      <div className="flex items-center justify-between pb-1 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <FilterIcon className="size-3.5 text-primary" />
          <span>Filtres avancés</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcwIcon className="size-3" />
          <span>Réinitialiser les filtres</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Type de document */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="search-type" className="text-xs font-medium text-foreground">
            Type de document
          </Label>
          <select
            id="search-type"
            value={selectedType}
            onChange={(e) => updateParam('type', e.target.value)}
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">Tous les types</option>
            {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentTypeKey[]).map((key) => (
              <option key={key} value={key}>
                {DOCUMENT_TYPE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        {/* Module */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="search-module" className="text-xs font-medium text-foreground">
            Module
          </Label>
          <select
            id="search-module"
            value={selectedModule}
            onChange={(e) => updateParam('module', e.target.value)}
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">Tous les modules</option>
            {(Object.keys(MODULE_LABELS) as ModuleKey[]).map((key) => (
              <option key={key} value={key}>
                {MODULE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        {/* Date début */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="search-from" className="text-xs font-medium text-foreground">
            Du
          </Label>
          <Input
            id="search-from"
            type="date"
            value={fromDate}
            onChange={(e) => updateParam('from', e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {/* Date fin */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="search-to" className="text-xs font-medium text-foreground">
            Au
          </Label>
          <Input
            id="search-to"
            type="date"
            value={toDate}
            onChange={(e) => updateParam('to', e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  )
}
