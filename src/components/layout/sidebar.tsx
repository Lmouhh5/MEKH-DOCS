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
    <div className="flex flex-col border-b border-zinc-800 bg-[#18181B]">
      {/* Industrial hazard diagonal safety stripe motif */}
      <div
        className="h-2 w-full bg-[repeating-linear-gradient(45deg,#d97706,#d97706_10px,#18181b_10px,#18181b_20px)]"
        aria-hidden="true"
      />
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-2 h-7 bg-amber-600 rounded-sm shrink-0" />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white uppercase truncate">
              ERP Documentaire
            </span>
            <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest px-1 py-0.5 rounded bg-amber-500/10">
              DZ
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 truncate leading-none mt-1">
            Travaux Publics & Concassage
          </span>
        </div>
      </div>
      <div className="mx-4 mb-3 py-1.5 px-2.5 bg-zinc-800/60 rounded flex items-center justify-between text-[11px] font-mono">
        <span className="text-zinc-400 uppercase">Régime Réel</span>
        <span className="text-amber-500 font-bold">DZ·DZD</span>
      </div>
    </div>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto" aria-label="Menu principal">
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
              'group flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors',
              active
                ? 'bg-amber-600 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-white'
            )}
          >
            <span
              className={cn(
                'text-[11px] font-mono shrink-0 transition-colors',
                active ? 'text-amber-200 font-bold' : 'text-zinc-500 group-hover:text-zinc-300'
              )}
            >
              {indexFormatted}
            </span>
            <Icon
              className={cn(
                'size-4 shrink-0 transition-colors',
                active ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
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
        'hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 bg-[#18181B] border-r border-zinc-800 text-zinc-100',
        className
      )}
    >
      <SidebarBrand />
      <SidebarNav />
      <div className="p-3 border-t border-zinc-800 mt-auto bg-zinc-900/40">
        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-2 py-1">
          <span className="truncate">Système Documentaire v2.0</span>
          <span className="size-2 rounded-full bg-emerald-500 shrink-0" title="En ligne" />
        </div>
      </div>
    </aside>
  )
}
