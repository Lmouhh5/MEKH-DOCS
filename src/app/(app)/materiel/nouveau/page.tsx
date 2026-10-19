'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MachineForm } from '@/components/entities/machine-form'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ArrowLeftIcon, Wrench } from 'lucide-react'

export default function NouveauMaterielPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 flex flex-col gap-6">
      <Link
        href="/materiel"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeftIcon className="size-3.5" />
        <span>Retour au parc matériel</span>
      </Link>

      <div className="flex items-center gap-3 border-b border-border/50 pb-5">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
          <Wrench className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Ajouter un matériel / engin
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enregistrez un nouvel équipement dans la flotte pour gérer ses fiches et documents associés.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Fiche descriptive de l&apos;engin
          </CardTitle>
          <CardDescription>
            Renseignez l&apos;identifiant interne, la marque, le modèle et les numéros d&apos;immatriculation / châssis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MachineForm
            onSuccess={() => router.push('/materiel')}
            onCancel={() => router.push('/materiel')}
          />
        </CardContent>
      </Card>
    </div>
  )
}
