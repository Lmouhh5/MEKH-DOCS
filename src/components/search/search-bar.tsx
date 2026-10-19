'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { SearchIcon, XIcon } from 'lucide-react'

export interface SearchBarProps {
  placeholder?: string
  className?: string
}

export function SearchBar({
  placeholder = 'Rechercher par titre, client, fournisseur, machine, travailleur...',
  className = '',
}: SearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const paramEntity = searchParams.get('entity') ?? ''
  const [value, setValue] = useState(paramEntity)

  // Sync internal state if URL searchParams change externally (e.g. filter reset)
  useEffect(() => {
    if (value.trim() !== paramEntity) {
      setValue(paramEntity)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramEntity])

  // Debounced update to router
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentParam = searchParams.get('entity') ?? ''
      const trimmed = value.trim()

      if (trimmed === currentParam) {
        return
      }

      const params = new URLSearchParams(searchParams.toString())
      if (trimmed) {
        params.set('entity', trimmed)
      } else {
        params.delete('entity')
      }

      const query = params.toString()
      const url = query ? `${pathname}?${query}` : pathname
      router.replace(url)
    }, 300)

    return () => clearTimeout(handler)
  }, [value, pathname, router, searchParams])

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <SearchIcon className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Recherche globale"
        className="pl-9 pr-9 h-10 w-full rounded-lg bg-background border border-input shadow-sm focus-visible:ring-2 focus-visible:ring-primary text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-3 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Effacer la recherche"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  )
}
