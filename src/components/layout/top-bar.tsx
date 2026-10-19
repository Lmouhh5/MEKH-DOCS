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
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 md:px-6 backdrop-blur-md">
      {/* Left: Mobile menu toggle + Breadcrumbs / Page Context */}
      <div className="flex items-center gap-3">
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
          <SheetContent side="left" className="p-0 w-72 flex flex-col gap-0">
            <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
            <SidebarBrand />
            <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <React.Fragment key={`${crumb.label}-${idx}`}>
                {idx > 0 && (
                  <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" aria-hidden="true" />
                )}
                {isLast ? (
                  <span className="font-semibold text-foreground tracking-tight">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href || '/'}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            )
          })}
        </nav>
      </div>

      {/* Right: User Email, Role Badge, Sign Out */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end text-right">
          <span className="text-xs font-medium text-foreground leading-none" data-testid="user-email">
            {userEmail}
          </span>
          <Badge variant="secondary" className="mt-1 text-[10px] font-semibold">
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
