import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import type { AdapterUser } from 'next-auth/adapters'
import { authorize, authOptions } from './auth'

jest.mock('@/lib/db', () => {
  const mockUser = {
    id: 'user-admin-1',
    email: 'admin@erp.local',
    password: bcrypt.hashSync('admin123', 10),
    role: 'ADMIN',
  }

  return {
    __esModule: true,
    default: {
      user: {
        findUnique: jest.fn(async ({ where }: { where: { email: string } }) => {
          if (where.email === 'admin@erp.local') {
            return mockUser
          }
          return null
        }),
      },
    },
    db: {
      user: {
        findUnique: jest.fn(async ({ where }: { where: { email: string } }) => {
          if (where.email === 'admin@erp.local') {
            return mockUser
          }
          return null
        }),
      },
    },
  }
})

describe('auth authorize', () => {
  it('rejects login with missing email or password', async () => {
    expect(await authorize(undefined)).toBeNull()
    expect(await authorize({ email: 'admin@erp.local' })).toBeNull()
    expect(await authorize({ password: 'admin' })).toBeNull()
  })

  it('rejects login when user is not found', async () => {
    const result = await authorize({ email: 'unknown@erp.local', password: 'password' })
    expect(result).toBeNull()
  })

  it('rejects login with wrong password', async () => {
    const result = await authorize({ email: 'admin@erp.local', password: 'wrong' })
    expect(result).toBeNull()
  })

  it('returns user on correct credentials', async () => {
    const result = await authorize({ email: 'admin@erp.local', password: 'admin123' })
    expect(result).toMatchObject({
      id: 'user-admin-1',
      email: 'admin@erp.local',
      role: 'ADMIN',
    })
  })
})

describe('authOptions callbacks', () => {
  it('jwt callback attaches id and role to token', async () => {
    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: {
        id: 'user-1',
        email: 'user@erp.local',
        role: Role.MANAGER,
      },
      account: null,
    })
    expect(token).toEqual({
      id: 'user-1',
      role: Role.MANAGER,
    })
  })

  it('session callback attaches id and role to session.user', async () => {
    const session = await authOptions.callbacks!.session!({
      session: {
        user: { id: 'user-1', role: Role.ADMIN, name: 'Admin', email: 'admin@erp.local' },
        expires: '2026-12-31',
      },
      token: {
        id: 'user-1',
        role: Role.ADMIN,
      },
      user: {
        id: 'user-1',
        email: 'admin@erp.local',
        emailVerified: null,
      } as unknown as AdapterUser,
      newSession: null,
      trigger: 'update',
    })
    expect(session.user).toEqual({
      name: 'Admin',
      email: 'admin@erp.local',
      id: 'user-1',
      role: Role.ADMIN,
    })
  })
})
