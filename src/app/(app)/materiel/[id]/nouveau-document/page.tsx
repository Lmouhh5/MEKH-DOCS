'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DocumentUploadForm } from '@/components/documents/document-upload-form'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ArrowLeftIcon, FileUpIcon, InfoIcon } from 'lucide-react'

export default function NouveauDocumentMaterielPage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id as string) || ''

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-3">
        <Link
          href={`/materiel/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Retour à la fiche matériel</span>
        </Link>

        <div className="flex items-center gap-3 border-b border-border/50 pb-5">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <FileUpIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Nouveau Document Matériel
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Téléversez un document officiel ou technique rattaché à cet engin (Carte grise, Assurance, Contrôle technique, D10, Facture de réparation).
            </p>
          </div>
        </div>
      </div>

      {/* Due Date Enforcement Notice */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300">
        <InfoIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sm">
            Exigence réglementaire relative aux dates d&apos;échéance
          </p>
          <p>
            Pour les contrats d&apos;<strong>Assurance</strong> et les <strong>Contrôles techniques</strong>, la date d&apos;échéance est strictement obligatoire afin de permettre le calcul automatique des alertes de validité.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Détails du document</CardTitle>
          <CardDescription>
            Tous les documents téléversés seront archivés de manière sécurisée et rattachés à cet engin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploadForm
            module="MATERIEL"
            entityId={id}
            onSuccess={() => router.push(`/materiel/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
