const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@test.com'
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123'
  const saltRounds = Number(process.env.SEED_SALT_ROUNDS) || 10

  const hashed = await bcrypt.hash(password, saltRounds)

  await prisma.user.upsert({
    where: { email },
    update: { password: hashed },
    create: { email, password: hashed },
  })

  console.log(`Seeded user: ${email}`)
  console.log('Plain password (for your reference):', password)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
