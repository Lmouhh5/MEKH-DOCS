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
  Building2,
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
]

export function isRouteActive(currentPath: string, targetHref: string): boolean {
  if (targetHref === '/') {
    return currentPath === '/'
  }
  return currentPath === targetHref || currentPath.startsWith(`${targetHref}/`)
}

export function SidebarBrand() {
  return (
    <div className="flex h-16 items-center gap-3 px-6 border-b border-border bg-card">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Building2 className="size-5" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-bold text-sm tracking-tight text-foreground truncate">
          ERP Documentaire
        </span>
        <span className="text-[11px] text-muted-foreground truncate leading-none mt-1">
          Travaux Publics & Concassage
        </span>
      </div>
    </div>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto" aria-label="Menu principal">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = isRouteActive(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon
              className={cn(
                'size-4 shrink-0 transition-colors',
                active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
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
        'hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 bg-card border-r border-border',
        className
      )}
    >
      <SidebarBrand />
      <SidebarNav />
      <div className="p-4 border-t border-border mt-auto">
        <p className="text-[11px] text-muted-foreground text-center">
          Système Documentaire v2.0
        </p>
      </div>
    </aside>
  )
}
