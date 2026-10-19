'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WorkerForm } from '@/components/entities/worker-form'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ArrowLeftIcon, UserPlusIcon } from 'lucide-react'

export default function NouveauPersonnelPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/personnel"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Retour à la liste du personnel</span>
        </Link>

        <div className="flex items-center gap-3 border-b border-border/50 pb-5">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <UserPlusIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Nouvel Employé
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Renseignez les informations de base du travailleur pour créer son dossier administratif RH.
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de l&apos;employé</CardTitle>
          <CardDescription>
            Tous les champs marqués d&apos;un astérisque (*) sont obligatoires.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkerForm
            onSuccess={() => router.push('/personnel')}
            onCancel={() => router.push('/personnel')}
          />
        </CardContent>
      </Card>
    </div>
  )
}
