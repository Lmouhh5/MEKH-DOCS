'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  UserCheckIcon,
  PlusIcon,
  SearchIcon,
  FileTextIcon,
  Loader2Icon,
  ArrowRightIcon,
  CalendarIcon,
  ShieldCheckIcon,
} from 'lucide-react'

interface WorkerListItem {
  id: string
  nom: string
  numeroIdentification?: string | null
  dateDebutContrat?: string | null
  numeroCnas?: string | null
  createdAt: string
  _count?: {
    documents: number
  }
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
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

export default function PersonnelPage() {
  const [workers, setWorkers] = useState<WorkerListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchWorkers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/personnel')
      if (res.ok) {
        const data = await res.json()
        setWorkers(data)
      }
    } catch (err) {
      console.error('Failed to fetch personnel:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkers()
  }, [])

  const filteredWorkers = workers.filter((worker) => {
    const q = searchQuery.toLowerCase()
    return (
      worker.nom.toLowerCase().includes(q) ||
      (worker.numeroCnas && worker.numeroCnas.toLowerCase().includes(q)) ||
      (worker.numeroIdentification && worker.numeroIdentification.toLowerCase().includes(q))
    )
  })

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <UserCheckIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Gestion du Personnel &amp; RH
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consultez le personnel de l&apos;entreprise, leurs contrats, numéros CNAS et fiches de paie.
            </p>
          </div>
        </div>

        <Link
          href="/personnel/nouveau"
          className={cn(buttonVariants({ variant: 'default' }), 'gap-1.5')}
        >
          <PlusIcon className="size-4" />
          Nouvel employé
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3 max-w-md">
        <div className="relative w-full">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, CNAS, identifiant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
          <Loader2Icon className="size-8 animate-spin text-primary" />
          <p className="text-sm">Chargement du personnel...</p>
        </div>
      ) : workers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="p-3 rounded-full bg-muted/50 mb-3 text-muted-foreground">
              <UserCheckIcon className="size-8" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Aucun employé enregistré</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mb-4">
              Vous n&apos;avez pas encore d&apos;employé dans la base de données. Ajoutez votre premier collaborateur pour commencer.
            </p>
            <Link
              href="/personnel/nouveau"
              className={cn(buttonVariants({ variant: 'default' }), 'gap-1.5')}
            >
              <PlusIcon className="size-4" />
              Nouvel employé
            </Link>
          </CardContent>
        </Card>
      ) : filteredWorkers.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-lg bg-muted/20 text-muted-foreground">
          <p className="text-sm font-medium">Aucun résultat trouvé pour &quot;{searchQuery}&quot;</p>
          <p className="text-xs mt-1 text-muted-foreground/80">
            Vérifiez l&apos;orthographe ou essayez un autre critère de recherche.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Nom et Prénom</TableHead>
                <TableHead className="font-semibold">N° Identification (CIN)</TableHead>
                <TableHead className="font-semibold">Numéro CNAS</TableHead>
                <TableHead className="font-semibold">Date de début de contrat</TableHead>
                <TableHead className="font-semibold text-center">Documents archivés</TableHead>
                <TableHead className="font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkers.map((worker) => {
                const docCount = worker._count?.documents ?? 0
                return (
                  <TableRow
                    key={worker.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/personnel/${worker.id}`}
                        className="text-foreground hover:text-primary hover:underline font-semibold flex items-center gap-2"
                      >
                        <UserCheckIcon className="size-4 text-muted-foreground" />
                        <span>{worker.nom}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {worker.numeroIdentification || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {worker.numeroCnas ? (
                        <span className="flex items-center gap-1.5 font-mono text-xs">
                          <ShieldCheckIcon className="size-3.5 text-muted-foreground/70" />
                          {worker.numeroCnas}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon className="size-3.5 text-muted-foreground/70" />
                        {formatDate(worker.dateDebutContrat)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={docCount > 0 ? 'secondary' : 'outline'}
                        className="gap-1 font-mono text-xs"
                      >
                        <FileTextIcon className="size-3" />
                        {docCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/personnel/${worker.id}`}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1')}
                      >
                        <span>Consulter</span>
                        <ArrowRightIcon className="size-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
