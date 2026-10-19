import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    '/',
    '/(app)/:path*',
    '/api/((?!auth).*)',
    '/clients/:path*',
    '/fournisseurs/:path*',
    '/materiel/:path*',
    '/personnel/:path*',
    '/tresorerie/:path*',
    '/fiscalite/:path*',
    '/recherche/:path*',
    '/documents/:path*',
  ],
}
