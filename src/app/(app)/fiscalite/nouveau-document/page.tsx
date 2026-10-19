'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DocumentUploadForm } from '@/components/documents/document-upload-form'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ArrowLeftIcon, FileTextIcon, InfoIcon, CalendarClockIcon } from 'lucide-react'

export default function NouveauDocumentFiscalitePage() {
  const router = useRouter()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
      {/* Navigation & En-tête */}
      <div className="flex flex-col gap-3">
        <Link
          href="/fiscalite"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Retour à la fiscalité</span>
        </Link>

        <div className="flex items-center gap-3 border-b border-border/50 pb-5">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <FileTextIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Nouveau Document Fiscal ou Social
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Téléversez vos déclarations fiscales (G50, G4, État 104) ou déclarations d&apos;organismes sociaux (CNAS, CASNOS, CACOBATPH).
            </p>
          </div>
        </div>
      </div>

      {/* Note d'information sur les échéances déclaratives */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
        <div className="p-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
          <CalendarClockIcon className="size-4" />
        </div>
        <div className="flex flex-col gap-1 leading-relaxed">
          <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <InfoIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
            Rappel des échéances périodiques
          </span>
          <p className="text-muted-foreground">
            Pensez à renseigner la <strong>date d&apos;échéance</strong> pour le suivi des déclarations périodiques (par exemple : le <strong>G50</strong> mensuel est exigible le <strong>20 du mois</strong>, les déclarations trimestrielles <strong>CNAS / CACOBATPH</strong> le <strong>30 ou 31</strong>). Cela permet au système d&apos;activer les alertes d&apos;échéance dans le tableau de bord.
          </p>
        </div>
      </div>

      {/* Carte du formulaire de téléversement */}
      <Card>
        <CardHeader>
          <CardTitle>Détails du document fiscal / social</CardTitle>
          <CardDescription>
            Ce coffre-fort d&apos;entreprise classe et archive vos déclarations et justificatifs sans rattachement à un tiers spécifique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploadForm
            module="FISCALITE"
            entityId={null}
            onSuccess={() => router.push('/fiscalite')}
          />
        </CardContent>
      </Card>
    </div>
  )
}
