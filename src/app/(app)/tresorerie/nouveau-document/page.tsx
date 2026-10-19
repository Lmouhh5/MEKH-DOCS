'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DocumentUploadForm } from '@/components/documents/document-upload-form'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ArrowLeftIcon, LandmarkIcon } from 'lucide-react'

export default function NouveauDocumentTresoreriePage() {
  const router = useRouter()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/tresorerie"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Retour à la trésorerie</span>
        </Link>

        <div className="flex items-center gap-3 border-b border-border/50 pb-5">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <LandmarkIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Nouveau Document de Trésorerie
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Téléversez un relevé bancaire ou un reçu de paiement rattaché aux flux financiers de l&apos;entreprise.
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Détails du document bancaire</CardTitle>
          <CardDescription>
            Ce module sans entité archive vos relevés bancaires et reçus de paiement en toute sécurité.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploadForm
            module="TRESORERIE"
            entityId={null}
            onSuccess={() => router.push('/tresorerie')}
          />
        </CardContent>
      </Card>
    </div>
  )
}
