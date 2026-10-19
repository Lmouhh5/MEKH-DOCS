'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SupplierForm } from '@/components/entities/supplier-form'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ArrowLeftIcon, UserPlusIcon } from 'lucide-react'

export default function NouveauFournisseurPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/fournisseurs"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Retour à la liste des fournisseurs</span>
        </Link>

        <div className="flex items-center gap-3 border-b border-border/50 pb-5">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <UserPlusIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Nouveau Fournisseur
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Renseignez les informations de base du fournisseur pour créer sa fiche d&apos;entreprise.
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Coordonnées du fournisseur</CardTitle>
          <CardDescription>
            Tous les champs marqués d&apos;un astérisque (*) sont obligatoires.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierForm
            onSuccess={() => router.push('/fournisseurs')}
            onCancel={() => router.push('/fournisseurs')}
          />
        </CardContent>
      </Card>
    </div>
  )
}
