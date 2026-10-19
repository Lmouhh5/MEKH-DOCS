import bcrypt from 'bcryptjs'
import db from '../src/lib/db'

export async function seed() {
  const hashedPassword = await bcrypt.hash('admin123', 12)

  const admin = await db.user.upsert({
    where: { email: 'admin@erp.local' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      email: 'admin@erp.local',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  return admin
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seeding completed successfully.')
    })
    .catch((e) => {
      console.error('Seeding error:', e)
      process.exit(1)
    })
    .finally(async () => {
      await db.$disconnect()
    })
}
