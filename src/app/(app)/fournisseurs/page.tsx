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
  TruckIcon,
  PlusIcon,
  SearchIcon,
  Building2Icon,
  FileTextIcon,
  PhoneIcon,
  Loader2Icon,
  ArrowRightIcon,
} from 'lucide-react'

interface SupplierListItem {
  id: string
  nom: string
  nif?: string | null
  telephone?: string | null
  adresse?: string | null
  createdAt: string
  _count?: {
    documents: number
  }
}

export default function FournisseursPage() {
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/fournisseurs')
      if (res.ok) {
        const data = await res.json()
        setSuppliers(data)
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const filteredSuppliers = suppliers.filter((supplier) => {
    const q = searchQuery.toLowerCase()
    return (
      supplier.nom.toLowerCase().includes(q) ||
      (supplier.nif && supplier.nif.toLowerCase().includes(q)) ||
      (supplier.telephone && supplier.telephone.toLowerCase().includes(q)) ||
      (supplier.adresse && supplier.adresse.toLowerCase().includes(q))
    )
  })

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <TruckIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Gestion des Fournisseurs
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consultez le portefeuille fournisseurs, leurs coordonnées et leurs documents associés.
            </p>
          </div>
        </div>

        <Link
          href="/fournisseurs/nouveau"
          className={cn(buttonVariants({ variant: 'default' }), 'gap-1.5')}
        >
          <PlusIcon className="size-4" />
          Nouveau fournisseur
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3 max-w-md">
        <div className="relative w-full">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, NIF, téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
          <Loader2Icon className="size-8 motion-safe:animate-spin text-primary" />
          <p className="text-sm">Chargement des fournisseurs...</p>
        </div>
      ) : suppliers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="p-3 rounded-full bg-muted/50 mb-3 text-muted-foreground">
              <Building2Icon className="size-8" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Aucun fournisseur enregistré</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mb-4">
              Vous n&apos;avez pas encore de fournisseur dans la base de données. Créez votre premier fournisseur pour commencer.
            </p>
            <Link
              href="/fournisseurs/nouveau"
              className={cn(buttonVariants({ variant: 'default' }), 'gap-1.5')}
            >
              <PlusIcon className="size-4" />
              Nouveau fournisseur
            </Link>
          </CardContent>
        </Card>
      ) : filteredSuppliers.length === 0 ? (
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
                <TableHead className="font-semibold">Raison Sociale / Nom</TableHead>
                <TableHead className="font-semibold">NIF</TableHead>
                <TableHead className="font-semibold">Téléphone</TableHead>
                <TableHead className="font-semibold">Adresse</TableHead>
                <TableHead className="font-semibold text-center">Documents</TableHead>
                <TableHead className="font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => {
                const docCount = supplier._count?.documents ?? 0
                return (
                  <TableRow
                    key={supplier.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/fournisseurs/${supplier.id}`}
                        className="text-foreground hover:text-primary hover:underline font-semibold flex items-center gap-2"
                      >
                        <Building2Icon className="size-4 text-muted-foreground" />
                        <span>{supplier.nom}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {supplier.nif || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {supplier.telephone ? (
                        <span className="flex items-center gap-1.5">
                          <PhoneIcon className="size-3.5 text-muted-foreground/70" />
                          {supplier.telephone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {supplier.adresse || '—'}
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
                        href={`/fournisseurs/${supplier.id}`}
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
