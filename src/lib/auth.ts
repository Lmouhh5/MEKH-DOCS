import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'
import { Role } from '@prisma/client'

export interface AuthUser {
  id: string
  email: string
  role: Role
}

export async function authorize(
  credentials?: Record<string, unknown>
): Promise<AuthUser | null> {
  if (!credentials?.email || !credentials?.password) {
    return null
  }

  const email = String(credentials.email).trim()
  const password = String(credentials.password)

  const user = await db.user.findUnique({
    where: { email },
  })

  if (!user || !user.password) {
    return null
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Adresse e-mail', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      authorize,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as AuthUser).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default authOptions
