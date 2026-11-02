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
  Wrench,
  PlusIcon,
  SearchIcon,
  FileTextIcon,
  Loader2Icon,
  ArrowRightIcon,
  Truck,
} from 'lucide-react'

interface MachineListItem {
  id: string
  machineId: string
  marque?: string | null
  modele?: string | null
  numeroSerie?: string | null
  matricule?: string | null
  statut: 'ACTIF' | 'EN_MAINTENANCE' | 'HORS_SERVICE'
  createdAt: string
  _count?: {
    documents: number
  }
}

export default function MaterielPage() {
  const [machines, setMachines] = useState<MachineListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const fetchMachines = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/materiel')
      if (res.ok) {
        const data = await res.json()
        setMachines(data)
      }
    } catch (err) {
      console.error('Failed to fetch machines:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMachines()
  }, [])

  const filteredMachines = machines.filter((machine) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      machine.machineId.toLowerCase().includes(q) ||
      (machine.marque && machine.marque.toLowerCase().includes(q)) ||
      (machine.modele && machine.modele.toLowerCase().includes(q)) ||
      (machine.matricule && machine.matricule.toLowerCase().includes(q)) ||
      (machine.numeroSerie && machine.numeroSerie.toLowerCase().includes(q))

    const matchesStatus =
      statusFilter === 'ALL' ? true : machine.statut === statusFilter

    return matchesSearch && matchesStatus
  })

  const renderStatusBadge = (statut: MachineListItem['statut']) => {
    switch (statut) {
      case 'ACTIF':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium"
          >
            Actif
          </Badge>
        )
      case 'EN_MAINTENANCE':
        return (
          <Badge
            variant="outline"
            className="bg-accent text-primary border-primary/30 font-medium"
          >
            En maintenance
          </Badge>
        )
      case 'HORS_SERVICE':
        return (
          <Badge
            variant="outline"
            className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-medium"
          >
            Hors service
          </Badge>
        )
      default:
        return <Badge variant="outline">{statut}</Badge>
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Wrench className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Parc Matériel & Engins
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Supervisez la flotte d&apos;équipements lourds, concasseurs, chargeuses et véhicules ainsi que leurs documents légaux.
            </p>
          </div>
        </div>

        <Link
          href="/materiel/nouveau"
          className={cn(buttonVariants({ variant: 'default' }), 'gap-1.5')}
        >
          <PlusIcon className="size-4" />
          Nouveau matériel
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par identifiant, marque, modèle, matricule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIF">Actif</option>
            <option value="EN_MAINTENANCE">En maintenance</option>
            <option value="HORS_SERVICE">Hors service</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
          <Loader2Icon className="size-8 motion-safe:animate-spin text-primary" />
          <p className="text-sm">Chargement du parc matériel...</p>
        </div>
      ) : machines.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="p-3 rounded-full bg-muted/50 mb-3 text-muted-foreground">
              <Truck className="size-8" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Aucun matériel enregistré</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mb-4">
              Votre parc matériel est actuellement vide. Enregistrez votre premier engin ou équipement lourd.
            </p>
            <Link
              href="/materiel/nouveau"
              className={cn(buttonVariants({ variant: 'default' }), 'gap-1.5')}
            >
              <PlusIcon className="size-4" />
              Nouveau matériel
            </Link>
          </CardContent>
        </Card>
      ) : filteredMachines.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-lg bg-muted/20 text-muted-foreground">
          <p className="text-sm font-medium">Aucun résultat trouvé pour vos filtres actuels</p>
          <p className="text-xs mt-1 text-muted-foreground/80">
            Essayez de modifier votre terme de recherche ou le filtre de statut.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Identifiant</TableHead>
                <TableHead className="font-semibold">Marque & Modèle</TableHead>
                <TableHead className="font-semibold">Matricule</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold text-center">Documents</TableHead>
                <TableHead className="font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.map((machine) => {
                const docCount = machine._count?.documents ?? 0
                const marqueModele = [machine.marque, machine.modele]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <TableRow
                    key={machine.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/materiel/${machine.id}`}
                        className="text-foreground hover:text-primary hover:underline font-semibold flex items-center gap-2"
                      >
                        <Wrench className="size-4 text-muted-foreground" />
                        <span className="font-mono">{machine.machineId}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {marqueModele || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {machine.matricule || '—'}
                    </TableCell>
                    <TableCell>
                      {renderStatusBadge(machine.statut)}
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
                        href={`/materiel/${machine.id}`}
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
