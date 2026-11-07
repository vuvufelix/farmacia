import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generateLicenseKey } from '../src/backend/utils/crypto.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 A iniciar o povoamento do banco de dados (Seeding)...')

  await prisma.return.deleteMany()
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.batch.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.user.deleteMany()
  await prisma.license.deleteMany()

  const passwordHash = await bcrypt.hash('123456', 10)

  const admin = await prisma.user.create({
    data: {
      name: 'Administrador Geral',
      username: 'admin',
      password: passwordHash,
      role: 'ADMIN' // Substituído de Role.ADMIN para string
    }
  })

  await prisma.user.create({
    data: {
      name: 'Operador de Caixa',
      username: 'caixa1',
      password: passwordHash,
      role: 'CAIXA' // Substituído de Role.CAIXA para string
    }
  })

  const shalina = await prisma.supplier.create({
    data: {
      name: 'Shalina Healthcare',
      phone: '+244923000000',
      email: 'vendas@shalina.co.ao',
      address: 'Luanda, Angola',
      nif: '5401122334'
    }
  })

  const catAnalgesicos = await prisma.category.create({ data: { name: 'Analgésicos e Antipiréticos' } })
  const catAntibioticos = await prisma.category.create({ data: { name: 'Antibióticos' } })

  const paracetamol = await prisma.product.create({
    data: {
      name: 'Paracetamol Shalina 500mg',
      code: '5601234567890',
      origin: 'Importado',
      costPrice: 800,
      sellingPrice: 1500,
      taxRate: 0.14,
      minStock: 20,
      categoryId: catAnalgesicos.id,
      supplierId: shalina.id
    }
  })

  const amoxicilina = await prisma.product.create({
    data: {
      name: 'Amoxicilina 500mg Caps',
      code: '5609876543210',
      origin: 'Importado',
      costPrice: 2000,
      sellingPrice: 3500,
      taxRate: 0.14,
      minStock: 15,
      categoryId: catAntibioticos.id,
      supplierId: shalina.id
    }
  })

  const now = new Date()
  
  const expireIn20Days = new Date(now)
  expireIn20Days.setDate(now.getDate() + 20)

  const expireIn90Days = new Date(now)
  expireIn90Days.setDate(now.getDate() + 90)

  await prisma.batch.create({
    data: {
      batchNumber: 'L-PAR2026-01',
      quantity: 50,
      manufacturingDate: new Date('2024-01-01'),
      expirationDate: expireIn20Days,
      productId: paracetamol.id
    }
  })

  await prisma.batch.create({
    data: {
      batchNumber: 'L-AMO2026-02',
      quantity: 30,
      manufacturingDate: new Date('2024-03-01'),
      expirationDate: expireIn90Days,
      productId: amoxicilina.id
    }
  })

  const startDate = new Date()
  const expiresAt = new Date()
  expiresAt.setDate(startDate.getDate() + 30)

  const seedLicenseKey = generateLicenseKey({
    pharmacyName: 'Farmácia Demonstração Nenova',
    startDate: startDate.toISOString(),
    expiresAt: expiresAt.toISOString()
  })

  await prisma.license.create({
    data: {
      pharmacyName: 'Farmácia Demonstração Nenova',
      licenseKey: seedLicenseKey,
      startDate,
      expiresAt,
      isActive: true
    }
  })

  console.log('✅ Banco de dados semeado com sucesso!')
  console.log('👤 Utilizador Admin criado: admin / 123456')
  console.log('🔑 Licença inicial de 30 dias gerada e ativada.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })