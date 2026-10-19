import React, { Suspense } from 'react'
import { SearchBar } from '@/components/search/search-bar'
import { SearchFilters } from '@/components/search/search-filters'
import { SearchResults } from '@/components/search/search-results'
import { Skeleton } from '@/components/ui/skeleton'
import { FileSearchIcon } from 'lucide-react'

export const metadata = {
  title: 'Recherche de Documents | Système ERP',
  description: 'Moteur de recherche global et consultation documentaire',
}

function SearchPageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  )
}

function SearchContent() {
  return (
    <div className="flex flex-col gap-6">
      {/* Top search & filter area */}
      <div className="flex flex-col gap-4">
        <SearchBar />
        <SearchFilters />
      </div>

      {/* Results area */}
      <SearchResults />
    </div>
  )
}

export default function RecherchePage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5 border-b border-border/50 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <FileSearchIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Recherche de Documents
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Retrouvez n&apos;importe quel document en moins de 30 secondes par entité, date ou type.
            </p>
          </div>
        </div>
      </div>

      {/* Suspense boundary for useSearchParams */}
      <Suspense fallback={<SearchPageFallback />}>
        <SearchContent />
      </Suspense>
    </div>
  )
}
