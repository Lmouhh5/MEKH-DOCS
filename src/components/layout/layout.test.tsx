import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar, NAV_ITEMS, isRouteActive } from './sidebar'
import { TopBar, getBreadcrumbs } from './top-bar'
import { signOut } from 'next-auth/react'

import AppLayout from '@/app/(app)/layout'
import { getServerSession } from 'next-auth'

let mockPathname = '/'
const mockRedirect = jest.fn()

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  redirect: (url: string) => mockRedirect(url),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}))

describe('isRouteActive helper', () => {
  it('identifies exact match for root route', () => {
    expect(isRouteActive('/', '/')).toBe(true)
    expect(isRouteActive('/recherche', '/')).toBe(false)
  })

  it('identifies active section and nested routes', () => {
    expect(isRouteActive('/clients', '/clients')).toBe(true)
    expect(isRouteActive('/clients/nouveau', '/clients')).toBe(true)
    expect(isRouteActive('/clients/123/edit', '/clients')).toBe(true)
    expect(isRouteActive('/clients-vip', '/clients')).toBe(false)
    expect(isRouteActive('/fournisseurs', '/clients')).toBe(false)
  })
})

describe('getBreadcrumbs helper', () => {
  it('returns Tableau de bord for root pathname', () => {
    expect(getBreadcrumbs('/')).toEqual([{ label: 'Tableau de bord' }])
  })

  it('returns ERP > Module for top-level sections', () => {
    expect(getBreadcrumbs('/recherche')).toEqual([
      { label: 'ERP', href: '/' },
      { label: 'Recherche' },
    ])
    expect(getBreadcrumbs('/clients')).toEqual([
      { label: 'ERP', href: '/' },
      { label: 'Clients' },
    ])
    expect(getBreadcrumbs('/materiel')).toEqual([
      { label: 'ERP', href: '/' },
      { label: 'Matériel & Engins' },
    ])
  })

  it('returns nested breadcrumbs for sub-paths', () => {
    expect(getBreadcrumbs('/clients/nouveau')).toEqual([
      { label: 'ERP', href: '/' },
      { label: 'Clients', href: '/clients' },
      { label: 'Nouveau' },
    ])
    expect(getBreadcrumbs('/fournisseurs/123')).toEqual([
      { label: 'ERP', href: '/' },
      { label: 'Fournisseurs', href: '/fournisseurs' },
      { label: 'Détail' },
    ])
  })
})

describe('Sidebar Component', () => {
  beforeEach(() => {
    mockPathname = '/'
    jest.clearAllMocks()
  })

  it('renders enterprise branding with title and subtitle', () => {
    render(<Sidebar />)
    expect(screen.getByText('ERP Documentaire')).toBeInTheDocument()
    expect(screen.getByText('Travaux Publics & Concassage')).toBeInTheDocument()
  })

  it('renders all 8 navigation items', () => {
    render(<Sidebar />)
    for (const item of NAV_ITEMS) {
      const link = screen.getByRole('link', { name: new RegExp(item.label, 'i') })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', item.href)
    }
  })

  it('highlights Tableau de bord as active when pathname is /', () => {
    mockPathname = '/'
    render(<Sidebar />)

    const dashboardLink = screen.getByRole('link', { name: /tableau de bord/i })
    expect(dashboardLink).toHaveAttribute('aria-current', 'page')

    const searchLink = screen.getByRole('link', { name: /recherche/i })
    expect(searchLink).not.toHaveAttribute('aria-current')
  })

  it('highlights Recherche as active when pathname is /recherche', () => {
    mockPathname = '/recherche'
    render(<Sidebar />)

    const searchLink = screen.getByRole('link', { name: /recherche/i })
    expect(searchLink).toHaveAttribute('aria-current', 'page')

    const dashboardLink = screen.getByRole('link', { name: /tableau de bord/i })
    expect(dashboardLink).not.toHaveAttribute('aria-current')
  })

  it('highlights module when inside nested sub-route', () => {
    mockPathname = '/clients/nouveau'
    render(<Sidebar />)

    const clientsLink = screen.getByRole('link', { name: /clients/i })
    expect(clientsLink).toHaveAttribute('aria-current', 'page')

    const searchLink = screen.getByRole('link', { name: /recherche/i })
    expect(searchLink).not.toHaveAttribute('aria-current')
  })
})

describe('TopBar Component', () => {
  beforeEach(() => {
    mockPathname = '/'
    jest.clearAllMocks()
  })

  it('renders breadcrumbs for dashboard when on root', () => {
    mockPathname = '/'
    render(<TopBar />)

    expect(screen.getByText('Tableau de bord')).toBeInTheDocument()
  })

  it('renders breadcrumbs for inner routes', () => {
    mockPathname = '/recherche'
    render(<TopBar />)

    expect(screen.getByText('ERP')).toBeInTheDocument()
    expect(screen.getByText('Recherche')).toBeInTheDocument()
  })

  it('displays user email and role badge Administrateur', () => {
    render(<TopBar user={{ email: 'directeur@chantier.dz', role: 'ADMIN' }} />)

    expect(screen.getByTestId('user-email')).toHaveTextContent('directeur@chantier.dz')
    expect(screen.getByText('Administrateur')).toBeInTheDocument()
  })

  it('falls back to default email when user prop is omitted', () => {
    render(<TopBar />)

    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@erp.local')
    expect(screen.getByText('Administrateur')).toBeInTheDocument()
  })

  it('calls signOut with callbackUrl /login when clicking Se déconnecter', () => {
    render(<TopBar />)

    const logoutBtn = screen.getByRole('button', { name: /se déconnecter/i })
    fireEvent.click(logoutBtn)

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' })
  })
})

describe('AppLayout Server Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to /login when session is null', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

    await AppLayout({ children: <div>Protected Content</div> })

    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('renders Sidebar, TopBar, and children when authenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { email: 'responsable@chantier.dz', role: 'ADMIN' },
    })

    const layoutJsx = await AppLayout({
      children: <div data-testid="test-child">Contenu Protégé</div>,
    })

    render(layoutJsx)

    expect(screen.getByText('ERP Documentaire')).toBeInTheDocument()
    expect(screen.getByTestId('test-child')).toHaveTextContent('Contenu Protégé')
    expect(screen.getByTestId('user-email')).toHaveTextContent('responsable@chantier.dz')
  })
})

