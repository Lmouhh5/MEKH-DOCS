'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Search,
  Users,
  Truck,
  Wrench,
  UserCheck,
  Landmark,
  FileText,
  Archive,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Tableau de bord',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Recherche',
    href: '/recherche',
    icon: Search,
  },
  {
    label: 'Clients',
    href: '/clients',
    icon: Users,
  },
  {
    label: 'Fournisseurs',
    href: '/fournisseurs',
    icon: Truck,
  },
  {
    label: 'Matériel & Engins',
    href: '/materiel',
    icon: Wrench,
  },
  {
    label: 'Personnel',
    href: '/personnel',
    icon: UserCheck,
  },
  {
    label: 'Trésorerie & Banque',
    href: '/tresorerie',
    icon: Landmark,
  },
  {
    label: 'Fiscalité & Administration',
    href: '/fiscalite',
    icon: FileText,
  },
  {
    label: 'Archives',
    href: '/archives',
    icon: Archive,
  },
]

export function isRouteActive(currentPath: string, targetHref: string): boolean {
  if (targetHref === '/') {
    return currentPath === '/'
  }
  return currentPath === targetHref || currentPath.startsWith(`${targetHref}/`)
}

export function SidebarBrand() {
  return (
    <div className="flex flex-col border-b border-rule">
      <div className="flex items-center gap-3 px-5 py-5">
        <div
          className="ribbon-part size-9 shrink-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <span className="h-4 w-1 rounded-pill bg-primary" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-display text-[15px] font-medium tracking-tight text-ink truncate">
            ERP Documentaire
          </span>
          <span className="text-[12px] text-muted-foreground truncate leading-snug mt-0.5">
            Travaux Publics & Concassage
          </span>
        </div>
      </div>
      <div className="mx-4 mb-4 flex items-center justify-between gap-2 border-t border-rule pt-3 text-[12px]">
        <span className="text-muted-foreground">Régime Réel</span>
        <span className="font-display tabular-nums text-primary">DZ·DZD</span>
      </div>
    </div>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 space-y-0.5 px-3 py-3 overflow-y-auto" aria-label="Menu principal">
      {NAV_ITEMS.map((item, index) => {
        const Icon = item.icon
        const active = isRouteActive(pathname, item.href)
        const indexFormatted = String(index).padStart(2, '0')

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 px-3 py-2.5 rounded-part text-sm font-medium',
              'transition-colors duration-micro ease-out-soft',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              active
                ? 'bg-accent text-ink'
                : 'text-muted-foreground hover:bg-paper-3 hover:text-ink'
            )}
          >
            <span
              className={cn(
                'text-[11px] font-mono tabular-nums shrink-0',
                active ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-muted-foreground'
              )}
            >
              {indexFormatted}
            </span>
            <Icon
              className={cn(
                'size-4 shrink-0',
                active ? 'text-primary' : 'text-muted-foreground group-hover:text-ink-2'
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside
      aria-label="Navigation latérale"
      className={cn(
        'hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30',
        'ribbon-panel ribbon-grain border-r border-rule text-ink rounded-none',
        className
      )}
    >
      <SidebarBrand />
      <SidebarNav />
      <div className="p-3 border-t border-rule mt-auto">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground px-2 py-1">
          <span className="truncate">Système Documentaire v2.0</span>
          <span className="text-primary font-display tabular-nums">live</span>
        </div>
      </div>
    </aside>
  )
}
