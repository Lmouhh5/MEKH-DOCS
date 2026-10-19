import bcrypt from 'bcryptjs'
import { seed } from './seed'
import db from '@/lib/db'

jest.mock('@/lib/db', () => {
  let adminUser: { id: string; email: string; password: string; role: string } | null = null

  return {
    __esModule: true,
    default: {
      user: {
        upsert: jest.fn(async ({ where, update, create }: { where: { email: string }; update: any; create: any }) => {
          adminUser = {
            id: 'cuid_admin',
            email: where.email,
            password: update.password || create.password,
            role: update.role || create.role,
          }
          return adminUser
        }),
        findUnique: jest.fn(async ({ where }: { where: { email: string } }) => {
          if (adminUser && adminUser.email === where.email) {
            return adminUser
          }
          return null
        }),
      },
      $disconnect: jest.fn().mockResolvedValue(undefined),
    },
    db: {
      user: {
        upsert: jest.fn(async ({ where, update, create }: { where: { email: string }; update: any; create: any }) => {
          adminUser = {
            id: 'cuid_admin',
            email: where.email,
            password: update.password || create.password,
            role: update.role || create.role,
          }
          return adminUser
        }),
        findUnique: jest.fn(async ({ where }: { where: { email: string } }) => {
          if (adminUser && adminUser.email === where.email) {
            return adminUser
          }
          return null
        }),
      },
      $disconnect: jest.fn().mockResolvedValue(undefined),
    },
  }
})

describe('Database Seed', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('seed creates admin user with hashed password', async () => {
    await seed()

    const user = await db.user.findUnique({ where: { email: 'admin@erp.local' } })
    expect(user).not.toBeNull()
    expect(user!.role).toBe('ADMIN')
    expect(user!.password).not.toBe('admin123')
    expect(bcrypt.compareSync('admin123', user!.password)).toBe(true)
    expect(db.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'admin@erp.local' },
        update: expect.objectContaining({
          role: 'ADMIN',
        }),
        create: expect.objectContaining({
          email: 'admin@erp.local',
          role: 'ADMIN',
        }),
      })
    )
  })
})
