import React from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
    return null
  }

  return (
    <div
      data-app-shell
      className="min-h-screen bg-background text-foreground flex flex-col md:flex-row"
    >
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 md:pl-64">
        <TopBar user={session.user} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 animate-ribbon-fade motion-reduce:animate-none">
          {children}
        </main>
      </div>
    </div>
  )
}
