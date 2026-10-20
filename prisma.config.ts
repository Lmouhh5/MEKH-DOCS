import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/erp_db',
  },
  migrations: {
    seed: 'npx ts-node prisma/seed.ts',
  },
})
