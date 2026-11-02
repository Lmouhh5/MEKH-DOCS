'use client'
/* Hallmark · waive 26b · display widgets with filter pills · active and disabled sit on RibbonSegButton */

import React from 'react'
import { cn } from '@/lib/utils'

export interface RibbonWidgetProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  meta?: React.ReactNode
  index?: number
  className?: string
  children: React.ReactNode
}

export function RibbonWidget({
  title,
  description,
  icon,
  action,
  meta,
  index = 0,
  className,
  children,
}: RibbonWidgetProps) {
  return (
    <section
      className={cn('ribbon-panel ribbon-grain ribbon-widget overflow-hidden', className)}
      style={{ ['--i' as string]: index }}
    >
      <header className="ribbon-widget__head">
        <div className="flex items-start gap-3 min-w-0">
          {icon ? (
            <div className="ribbon-part size-10 shrink-0 flex items-center justify-center text-primary">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-display text-lg font-medium tracking-tight text-ink max-w-none">
              {title}
            </h2>
            {description ? (
              <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {meta}
          {action}
        </div>
      </header>
      <div className="ribbon-widget__body">{children}</div>
    </section>
  )
}

export interface RibbonEmptyProps {
  title: string
  description: string
  action?: React.ReactNode
  meters?: { label: string; level: number }[]
  className?: string
}

const DEFAULT_METERS = [
  { label: 'Urgent', level: 0 },
  { label: 'Attention', level: 0 },
  { label: 'À venir', level: 0 },
]

export function RibbonEmpty({
  title,
  description,
  action,
  meters = DEFAULT_METERS,
  className,
}: RibbonEmptyProps) {
  return (
    <div className={cn('ribbon-empty', className)}>
      <div className="ribbon-empty__meters" aria-hidden="true">
        {meters.map((meter, i) => (
          <div key={meter.label} className="ribbon-empty__meter" style={{ ['--i' as string]: i }}>
            <span className="ribbon-empty__label">{meter.label}</span>
            <span className="ribbon-empty__track">
              <span
                className="ribbon-empty__fill"
                style={{ ['--level' as string]: `${meter.level}%`, ['--i' as string]: i }}
              />
            </span>
            <span className="ribbon-empty__value">{String(meter.level).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
      <div className="ribbon-empty__copy">
        <div className="flex items-center gap-2 mb-2">
          <span className="ribbon-empty__pulse" aria-hidden="true" />
          <span className="text-[12px] text-primary font-medium">Rien en alerte</span>
        </div>
        <h3>{title}</h3>
        <p>{description}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  )
}

export function RibbonMetaChip({
  children,
  lit = false,
  warn = false,
}: {
  children: React.ReactNode
  lit?: boolean
  warn?: boolean
}) {
  return (
    <span
      className={cn(
        'ribbon-level-chip',
        lit && 'ribbon-level-chip--lit',
        warn && 'ribbon-level-chip--warn'
      )}
    >
      {children}
    </span>
  )
}

export interface RibbonKpiItem {
  label: string
  value: React.ReactNode
  hint: React.ReactNode
  icon?: React.ReactNode
  tone?: 'default' | 'warn'
}

export function RibbonKpiStrip({
  items,
  className,
}: {
  items: RibbonKpiItem[]
  className?: string
}) {
  return (
    <section
      aria-label="Indicateurs clés"
      className={cn('ribbon-panel ribbon-grain ribbon-widget overflow-hidden', className)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={cn(
              'flex flex-col gap-3 p-5',
              i < items.length - 1 && 'sm:border-r border-rule border-b sm:border-b-0'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-muted-foreground">{item.label}</span>
              {item.icon ? (
                <span
                  className={cn(
                    'shrink-0',
                    item.tone === 'warn' ? 'text-destructive' : 'text-primary'
                  )}
                >
                  {item.icon}
                </span>
              ) : null}
            </div>
            <div
              className={cn(
                'font-display text-2xl sm:text-3xl font-normal tabular-nums tracking-tight truncate',
                item.tone === 'warn' ? 'text-destructive' : 'text-ink'
              )}
            >
              {item.value}
            </div>
            <p className="text-[13px] text-muted-foreground">{item.hint}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function RibbonSeg({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 p-1 rounded-pill border border-rule bg-paper-3/50',
        className
      )}
    >
      {children}
    </div>
  )
}

export function RibbonSegButton({
  active,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'px-3 py-1.5 text-[13px] font-medium rounded-pill transition-colors duration-micro',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'active:translate-y-px disabled:opacity-50 disabled:pointer-events-none',
        active
          ? 'bg-accent text-ink shadow-part'
          : 'text-muted-foreground hover:text-ink hover:bg-paper-2',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
