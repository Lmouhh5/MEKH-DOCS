'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DocumentUploadForm } from '@/components/documents/document-upload-form'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ArrowLeftIcon, FileUpIcon } from 'lucide-react'

export default function NouveauDocumentPersonnelPage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id as string) || ''

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-3">
        <Link
          href={`/personnel/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Retour au dossier employé</span>
        </Link>

        <div className="flex items-center gap-3 border-b border-border/50 pb-5">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <FileUpIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Nouveau Document RH / Personnel
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Téléversez une fiche de paie, un contrat de travail ou une pièce d&apos;identité rattachée à cet employé.
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Détails du document RH</CardTitle>
          <CardDescription>
            Tous les documents téléversés seront archivés de manière sécurisée et rattachés à ce salarié.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploadForm
            module="PERSONNEL"
            entityId={id}
            onSuccess={() => router.push(`/personnel/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
