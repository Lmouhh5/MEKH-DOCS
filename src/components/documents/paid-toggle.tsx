'use client'

import React, { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface PaidToggleProps {
  documentId: string
  isPaid?: boolean | null
  onToggle?: (newStatus: boolean) => void
  disabled?: boolean
  className?: string
}

export function PaidToggle({
  documentId,
  isPaid = false,
  onToggle,
  disabled = false,
  className,
}: PaidToggleProps) {
  const [paid, setPaid] = useState<boolean>(Boolean(isPaid))
  const [isUpdating, setIsUpdating] = useState<boolean>(false)

  useEffect(() => {
    setPaid(Boolean(isPaid))
  }, [isPaid])

  const handleToggle = async (checked: boolean) => {
    const previous = paid
    setPaid(checked)
    setIsUpdating(true)

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPaid: checked }),
      })

      if (!res.ok) {
        throw new Error('Erreur de mise à jour')
      }

      toast.success(checked ? 'Document marqué comme payé' : 'Document marqué comme impayé')
      onToggle?.(checked)
    } catch {
      setPaid(previous)
      toast.error('Erreur lors de la mise à jour du statut de paiement')
    } finally {
      setIsUpdating(false)
    }
  }

  const toggleId = `paid-toggle-${documentId}`

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Switch
        id={toggleId}
        checked={paid}
        onCheckedChange={handleToggle}
        disabled={disabled || isUpdating}
      />
      <Label
        htmlFor={toggleId}
        className={cn(
          'text-xs font-semibold  tracking-normal cursor-pointer select-none transition-colors',
          paid
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-primary'
        )}
      >
        {paid ? 'Payé' : 'Impayé'}
      </Label>
    </div>
  )
}
