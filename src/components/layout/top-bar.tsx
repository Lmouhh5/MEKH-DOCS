'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LogOut, ChevronRight, Menu } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { SidebarBrand, SidebarNav } from '@/components/layout/sidebar'

export interface TopBarProps {
  user?: {
    email?: string | null
    role?: string | null
    name?: string | null
  }
}

const SECTION_LABELS: Record<string, string> = {
  recherche: 'Recherche',
  clients: 'Clients',
  fournisseurs: 'Fournisseurs',
  materiel: 'Matériel & Engins',
  personnel: 'Personnel',
  tresorerie: 'Trésorerie & Banque',
  fiscalite: 'Fiscalité & Administration',
  archives: 'Archives',
}

export function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  if (pathname === '/') {
    return [{ label: 'Tableau de bord' }]
  }

  const crumbs: { label: string; href?: string }[] = [{ label: 'ERP', href: '/' }]
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return [{ label: 'Tableau de bord' }]
  }

  const rootSection = segments[0]
  const sectionLabel = SECTION_LABELS[rootSection] || rootSection

  if (segments.length === 1) {
    crumbs.push({ label: sectionLabel })
  } else {
    crumbs.push({ label: sectionLabel, href: `/${rootSection}` })
    const sub = segments[1]
    if (sub === 'nouveau') {
      crumbs.push({ label: 'Nouveau' })
    } else {
      crumbs.push({ label: 'Détail' })
    }
  }

  return crumbs
}

export function TopBar({ user }: TopBarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const breadcrumbs = getBreadcrumbs(pathname)
  const userEmail = user?.email || 'admin@erp.local'

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-rule bg-paper-2/90 px-4 md:px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3 min-w-0">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Ouvrir le menu de navigation"
              />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="p-0 w-72 flex flex-col gap-0 ribbon-panel border-r border-rule text-ink rounded-none"
          >
            <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
            <SidebarBrand />
            <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm min-w-0">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <React.Fragment key={`${crumb.label}-${idx}`}>
                {idx > 0 && (
                  <ChevronRight
                    className="size-3.5 text-muted-foreground/60 shrink-0"
                    aria-hidden="true"
                  />
                )}
                {isLast ? (
                  <span className="font-display font-medium text-ink tracking-tight truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href || '/'}
                    className="text-muted-foreground hover:text-ink transition-colors duration-micro truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            )
          })}
        </nav>
      </div>

      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-pill border border-rule bg-paper-3/60 text-[12px]">
        <span className="font-medium text-ink">Exercice Fiscal 2026</span>
        <span className="text-muted-foreground" aria-hidden="true">
          /
        </span>
        <span className="text-muted-foreground">SARL Carrières &amp; Travaux</span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col items-end text-right">
          <span
            className="text-xs font-medium text-ink leading-none"
            data-testid="user-email"
          >
            {userEmail}
          </span>
          <Badge variant="secondary" className="mt-1 text-[11px] font-medium">
            Administrateur
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="gap-1.5 text-xs font-medium"
          aria-label="Se déconnecter"
        >
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">Se déconnecter</span>
        </Button>
      </div>
    </header>
  )
}
