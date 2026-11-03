'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { ClusterCard, ClusterCardData } from '@/components/archives/cluster-card'
import { CreateClusterDialog } from '@/components/archives/create-cluster-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArchiveIcon,
  PlusIcon,
  SearchIcon,
  Loader2Icon,
  FolderPlusIcon,
} from 'lucide-react'

export default function ArchivesPage() {
  const [clusters, setClusters] = useState<ClusterCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const fetchClusters = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/archive/clusters')
      if (res.ok) {
        const data = (await res.json()) as ClusterCardData[]
        setClusters(data)
      }
    } catch (err) {
      console.error('Failed to fetch archive clusters:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClusters()
  }, [fetchClusters])

  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) return clusters
    const q = searchQuery.toLowerCase().trim()
    return clusters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    )
  }, [clusters, searchQuery])

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <ArchiveIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              08 · Archives & Dossiers
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consultez, classez et archivez vos dossiers et pièces justificatives.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="gap-1.5 self-start sm:self-auto"
        >
          <PlusIcon className="size-4" />
          + Nouveau Dossier
        </Button>
      </div>

      {/* Search Input */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un dossier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {clusters.length} dossier{clusters.length > 1 ? 's' : ''} racine{clusters.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-3">
          <Loader2Icon className="size-8 motion-safe:animate-spin text-primary" />
          <p className="text-sm">Chargement des dossiers d&apos;archives...</p>
        </div>
      ) : clusters.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed rounded-lg bg-muted/10">
          <div className="p-3.5 rounded-full bg-muted/40 mb-3 text-muted-foreground">
            <FolderPlusIcon className="size-9" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Aucun dossier d&apos;archives
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mb-5">
            Créez votre premier dossier pour organiser et stocker vos documents et pièces justificatives.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-1.5">
            <PlusIcon className="size-4" />
            + Nouveau Dossier
          </Button>
        </div>
      ) : filteredClusters.length === 0 ? (
        <div className="p-10 text-center border border-dashed rounded-lg bg-muted/10 text-muted-foreground">
          <p className="text-sm font-medium">
            Aucun dossier trouvé pour « {searchQuery} »
          </p>
          <p className="text-xs mt-1 text-muted-foreground/80">
            Essayez de modifier votre mot-clé de recherche.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClusters.map((cluster) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              onRefresh={fetchClusters}
            />
          ))}
        </div>
      )}

      {/* Dialog for creating root cluster */}
      <CreateClusterDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchClusters}
      />
    </div>
  )
}
