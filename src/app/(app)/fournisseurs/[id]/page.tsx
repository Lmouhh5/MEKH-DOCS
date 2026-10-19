'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { SupplierForm, SupplierData } from '@/components/entities/supplier-form'
import { EntityDocumentList } from '@/components/entities/entity-document-list'
import { DocumentSummary } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  TruckIcon,
  PhoneIcon,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
  ArrowLeftIcon,
  Loader2Icon,
  PlusIcon,
  HashIcon,
} from 'lucide-react'

interface SupplierFullDetail extends SupplierData {
  id: string
  nom: string
  nif?: string | null
  telephone?: string | null
  adresse?: string | null
  createdAt: string
  updatedAt: string
  documents: DocumentSummary[]
}

export default function SupplierProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id as string) || ''

  const [supplier, setSupplier] = useState<SupplierFullDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchSupplier = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const res = await fetch(`/api/fournisseurs/${id}`)
      if (res.status === 404) {
        toast.error('Fournisseur non trouvé')
        router.push('/fournisseurs')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setSupplier(data)
      } else {
        toast.error('Impossible de charger les données du fournisseur')
      }
    } catch (err) {
      console.error('Error fetching supplier:', err)
      toast.error('Erreur lors du chargement du fournisseur')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchSupplier()
  }, [fetchSupplier])

  const handleDelete = async () => {
    if (!supplier) return
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le fournisseur "${supplier.nom}" ? Cette action supprimera également tous ses documents associés.`
    )
    if (!confirmed) return

    try {
      setIsDeleting(true)
      const res = await fetch(`/api/fournisseurs/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Fournisseur supprimé avec succès')
        router.push('/fournisseurs')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de la suppression du fournisseur')
      }
    } catch {
      toast.error('Erreur de communication avec le serveur')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateSuccess = (updatedData: SupplierData) => {
    setSupplier((prev) => (prev ? { ...prev, ...updatedData } : null))
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2Icon className="size-8 animate-spin text-primary" />
        <p className="text-sm">Chargement du profil fournisseur...</p>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Fournisseur introuvable</p>
        <Link
          href="/fournisseurs"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4')}
        >
          Retour aux fournisseurs
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 flex flex-col gap-8">
      {/* Top navigation */}
      <div className="flex flex-col gap-3">
        <Link
          href="/fournisseurs"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Retour à la liste des fournisseurs</span>
        </Link>

        {/* Header with Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <TruckIcon className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {supplier.nom}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fiche fournisseur détaillée & documents comptables et contractuels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/fournisseurs/${id}/nouveau-document`}
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-1.5')}
            >
              <PlusIcon className="size-4" />
              Nouveau document
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-1.5"
            >
              <PencilIcon className="size-3.5" />
              {isEditing ? 'Annuler' : 'Modifier'}
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              <Trash2Icon className="size-3.5" />
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Details Card / Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {isEditing ? 'Modifier les coordonnées' : 'Coordonnées & Informations'}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? 'Mettez à jour les informations du fournisseur ci-dessous.'
              : "Informations d'identification fiscale et de contact."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <SupplierForm
              supplier={supplier}
              onSuccess={handleUpdateSuccess}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TruckIcon className="size-3.5" />
                  Raison Sociale / Nom
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {supplier.nom}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <HashIcon className="size-3.5" />
                  NIF
                </span>
                <span className="text-sm font-mono text-foreground">
                  {supplier.nif || 'Non renseigné'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <PhoneIcon className="size-3.5" />
                  Téléphone
                </span>
                <span className="text-sm text-foreground">
                  {supplier.telephone || 'Non renseigné'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <MapPinIcon className="size-3.5" />
                  Adresse
                </span>
                <span className="text-sm text-foreground">
                  {supplier.adresse || 'Non renseignée'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardContent className="pt-6">
          <EntityDocumentList
            module="FOURNISSEURS"
            entityId={id}
            initialDocuments={supplier.documents}
          />
        </CardContent>
      </Card>
    </div>
  )
}
