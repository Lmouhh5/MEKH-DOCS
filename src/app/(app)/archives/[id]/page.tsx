'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ClusterCard, ClusterCardData } from '@/components/archives/cluster-card'
import { ArchiveDocumentTable, ArchiveDocumentItem } from '@/components/archives/archive-document-table'
import { CreateClusterDialog } from '@/components/archives/create-cluster-dialog'
import { UploadArchiveDialog } from '@/components/archives/upload-archive-dialog'
import { DeleteClusterDialog } from '@/components/archives/delete-cluster-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  FolderIcon,
  FolderPlusIcon,
  UploadCloudIcon,
  ChevronRightIcon,
  Loader2Icon,
  AlertTriangleIcon,
  FilesIcon,
  FolderTreeIcon,
  PencilIcon,
  Trash2Icon,
  ArrowLeftIcon,
} from 'lucide-react'
import { toast } from 'sonner'

interface BreadcrumbNode {
  id: string
  name: string
}

interface ClusterDetailData {
  id: string
  name: string
  description?: string | null
  parentId?: string | null
  breadcrumbs?: BreadcrumbNode[]
  children?: ClusterCardData[]
  documents?: ArchiveDocumentItem[]
}

export interface ClusterWorkspacePageProps {
  params?: { id: string } | Promise<{ id: string }>
}

export default function ClusterWorkspacePage({ params }: ClusterWorkspacePageProps = {}) {
  const router = useRouter()
  const routerParams = useParams() as { id?: string } | undefined

  const [clusterId, setClusterId] = useState<string>(() => {
    if (params && !(params instanceof Promise)) {
      return params.id
    }
    if (!params && routerParams?.id) {
      return routerParams.id
    }
    return ''
  })

  const [cluster, setCluster] = useState<ClusterDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Dialogs state
  const [createSubOpen, setCreateSubOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(false)

  useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => {
        if (resolved?.id) setClusterId(resolved.id)
      })
    } else if (params?.id) {
      setClusterId(params.id)
    } else if (routerParams?.id) {
      setClusterId(routerParams.id)
    }
  }, [params, routerParams?.id])

  const fetchClusterDetail = useCallback(async () => {
    if (!clusterId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setNotFound(false)
      const res = await fetch(`/api/archive/clusters/${clusterId}`)

      if (!res.ok) {
        if (res.status === 404) {
          setNotFound(true)
        } else {
          toast.error('Erreur lors du chargement du dossier')
        }
        return
      }

      const data = (await res.json()) as ClusterDetailData
      if (!data || typeof data !== 'object' || !data.id) {
        setNotFound(true)
        return
      }
      setCluster(data)
      setNewName(data.name || '')
    } catch (err) {
      console.error('Failed to fetch cluster details:', err)
      toast.error('Erreur réseau lors du chargement du dossier')
    } finally {
      setLoading(false)
    }
  }, [clusterId])

  useEffect(() => {
    fetchClusterDetail()
  }, [fetchClusterDetail])

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cluster) return
    const trimmed = newName.trim()
    if (!trimmed) {
      toast.error('Le nom du dossier est requis')
      return
    }

    try {
      setRenaming(true)
      const res = await fetch(`/api/archive/clusters/${cluster.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })

      const data = (await res.json().catch(() => ({}))) as { error?: string }

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la modification')
        return
      }

      toast.success('Dossier renommé avec succès')
      setRenameOpen(false)
      fetchClusterDetail()
    } catch {
      toast.error('Erreur réseau lors de la modification')
    } finally {
      setRenaming(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2Icon className="size-8 motion-safe:animate-spin text-primary" />
        <p className="text-sm">Chargement du dossier...</p>
      </div>
    )
  }

  if (notFound || !cluster) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 flex flex-col items-center justify-center text-center">
        <div className="p-3.5 rounded-full bg-destructive/10 text-destructive mb-3">
          <AlertTriangleIcon className="size-8" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Dossier introuvable
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mb-5">
          Ce dossier n&apos;existe pas ou a été supprimé.
        </p>
        <Link
          href="/archives"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          Retour aux archives
        </Link>
      </div>
    )
  }

  const breadcrumbs = cluster.breadcrumbs || [{ id: cluster.id, name: cluster.name }]
  const children = cluster.children || []
  const documents = cluster.documents || []

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col gap-6">
      {/* Breadcrumbs Navigation */}
      <nav
        aria-label="Fil d'Ariane"
        className="flex items-center flex-wrap gap-1.5 text-xs text-muted-foreground"
      >
        <Link
          href="/archives"
          className="hover:text-foreground transition-colors font-medium flex items-center gap-1"
        >
          <span>Archives</span>
        </Link>
        {breadcrumbs.map((crumb) => {
          const isCurrent = crumb.id === cluster.id
          return (
            <React.Fragment key={crumb.id}>
              <ChevronRightIcon className="size-3 text-muted-foreground/60 shrink-0" />
              {isCurrent ? (
                <span className="font-semibold text-foreground truncate max-w-xs">
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={`/archives/${crumb.id}`}
                  className="hover:text-foreground transition-colors truncate max-w-xs"
                >
                  {crumb.name}
                </Link>
              )}
            </React.Fragment>
          )
        })}
      </nav>

      {/* Cluster Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-1">
            <FolderIcon className="size-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {cluster.name}
              </h1>
              <Badge variant="secondary" className="gap-1">
                <FilesIcon className="size-3" />
                {documents.length} document{documents.length > 1 ? 's' : ''}
              </Badge>
              {children.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <FolderTreeIcon className="size-3" />
                  {children.length} sous-dossier{children.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {cluster.description && (
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                {cluster.description}
              </p>
            )}
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreateSubOpen(true)}
            className="gap-1.5 text-xs h-9"
          >
            <FolderPlusIcon className="size-4" />
            + Nouveau Sous-Dossier
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setUploadOpen(true)}
            className="gap-1.5 text-xs h-9"
          >
            <UploadCloudIcon className="size-4" />
            + Déposer un document
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setNewName(cluster.name)
              setRenameOpen(true)
            }}
            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <PencilIcon className="size-3.5 mr-1" />
            Renommer
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="h-9 px-2 text-xs text-destructive hover:bg-destructive/10"
          >
            <Trash2Icon className="size-3.5 mr-1" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* Sub-Clusters Section (if any) */}
      {children.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              <FolderTreeIcon className="size-4 text-primary" />
              Sous-dossiers ({children.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child) => (
              <ClusterCard
                key={child.id}
                cluster={child}
                onRefresh={fetchClusterDetail}
              />
            ))}
          </div>
        </section>
      )}

      {/* Documents Section */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            <FilesIcon className="size-4 text-primary" />
            Documents archivés ({documents.length})
          </h2>
        </div>
        <ArchiveDocumentTable
          documents={documents}
          clusterId={cluster.id}
          clusterName={cluster.name}
          onRefresh={fetchClusterDetail}
        />
      </section>

      {/* Create Sub-Cluster Dialog */}
      <CreateClusterDialog
        open={createSubOpen}
        onOpenChange={setCreateSubOpen}
        parentId={cluster.id}
        parentName={cluster.name}
        onSuccess={fetchClusterDetail}
      />

      {/* Upload Document Dialog */}
      <UploadArchiveDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        clusterId={cluster.id}
        clusterName={cluster.name}
        onSuccess={fetchClusterDetail}
      />

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renommer le dossier</DialogTitle>
            <DialogDescription>
              Modifier le nom du dossier d&apos;archives actuel.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rename-current-cluster">
                Nouveau nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rename-current-cluster"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={renaming}
                autoFocus
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
                disabled={renaming}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={renaming}>
                {renaming ? (
                  <>
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                    Modification...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Cluster Dialog */}
      <DeleteClusterDialog
        clusterId={cluster.id}
        clusterName={cluster.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => {
          router.push('/archives')
        }}
      />
    </div>
  )
}
