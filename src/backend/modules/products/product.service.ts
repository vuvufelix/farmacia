import { prisma } from '../../database/prisma.client.js'

export class ProductService {
  static async createProduct(data: any) {
    const { initialStock, batchNumber, expirationDate, ...productData } = data;

    return prisma.$transaction(async (tx: any) => {
      const product = await tx.product.create({
        data: productData,
        include: {
          category: true,
          supplier: true
        }
      });

      // Se foram passados dados de lote inicial na criação
      if (initialStock && initialStock > 0) {
        await tx.batch.create({
          data: {
            batchNumber: batchNumber || `LOTE-${Date.now().toString().slice(-6)}`,
            quantity: Number(initialStock),
            expirationDate: expirationDate ? new Date(expirationDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            productId: product.id
          }
        });
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: { category: true, supplier: true, batches: true }
      });
    });
  }

  static async listProducts() {
    return prisma.product.findMany({
      include: {
        category: true,
        supplier: true,
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expirationDate: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })
  }

  static async addBatch(data: {
    batchNumber: string
    quantity: number
    manufacturingDate?: string
    expirationDate: string
    productId: string
  }) {
    return prisma.batch.create({
      data: {
        batchNumber: data.batchNumber,
        quantity: data.quantity,
        manufacturingDate: data.manufacturingDate ? new Date(data.manufacturingDate) : null,
        expirationDate: new Date(data.expirationDate),
        productId: data.productId
      }
    })
  }

  static async getExpirationAlerts() {
    const now = new Date()
    
    const limit30 = new Date(now)
    limit30.setDate(now.getDate() + 30)

    const limit60 = new Date(now)
    limit60.setDate(now.getDate() + 60)

    const limit90 = new Date(now)
    limit90.setDate(now.getDate() + 90)

    const batchesWithin90Days = await prisma.batch.findMany({
      where: {
        quantity: { gt: 0 },
        expirationDate: { lte: limit90 }
      },
      include: {
        product: {
          include: { category: true, supplier: true }
        }
      },
      orderBy: { expirationDate: 'asc' }
    })

    const expired: typeof batchesWithin90Days = []
    const alert30Days: typeof batchesWithin90Days = []
    const alert60Days: typeof batchesWithin90Days = []
    const alert90Days: typeof batchesWithin90Days = []

    for (const batch of batchesWithin90Days) {
      if (batch.expirationDate <= now) {
        expired.push(batch)
      } else if (batch.expirationDate <= limit30) {
        alert30Days.push(batch)
      } else if (batch.expirationDate <= limit60) {
        alert60Days.push(batch)
      } else {
        alert90Days.push(batch)
      }
    }

    return {
      summary: {
        expiredCount: expired.length,
        alert30Count: alert30Days.length,
        alert60Count: alert60Days.length,
        alert90Count: alert90Days.length
      },
      expired,
      alert30Days,
      alert60Days,
      alert90Days
    }
  }

  // No teu product.service.ts ou controller
  static async deleteProduct(id: string) {
    // 1. Verificar se o produto já possui vendas registadas na base de dados
    const salesCount = await prisma.saleItem.count({
      where: { productId: id }
    });

    // 2. Se já tiver histórico de vendas, fazemos Soft Delete para preservar a integridade fiscal/auditoria
    if (salesCount > 0) {
      return await prisma.product.update({
        where: { id },
        data: { isActive: false }
      });
    }

    // 3. Caso nunca tenha sido vendido, removemos os lotes e o produto em transação
    return await prisma.$transaction(async (tx: any) => {
      await tx.batch.deleteMany({
        where: { productId: id }
      });

      return await tx.product.delete({
        where: { id }
      });
    });
  }

  static async updateProduct(id: string, data: any) {
    const { initialStock, quantity, batchNumber, expirationDate, ...productData } = data;
    const stockValue = initialStock ?? quantity;

    return await prisma.$transaction(async (tx: any) => {
      // 1. Atualiza os dados principais do produto
      const updatedProduct = await tx.product.update({
        where: { id },
        data: productData,
      });

      // 2. Se foi passada uma quantidade no update, ajusta ou cria o lote
      if (stockValue !== undefined && stockValue !== null && !isNaN(stockValue)) {
        const numericStock = Number(stockValue);
        
        const existingBatch = await tx.batch.findFirst({
          where: { productId: id },
          orderBy: { expirationDate: 'asc' },
        });

        if (existingBatch) {
          await tx.batch.update({
            where: { id: existingBatch.id },
            data: { 
              quantity: numericStock,
              ...(batchNumber ? { batchNumber } : {}),
              ...(expirationDate ? { expirationDate: new Date(expirationDate) } : {})
            },
          });
        } else if (numericStock > 0) {
          await tx.batch.create({
            data: {
              batchNumber: batchNumber || `LOTE-AUTO-${Date.now().toString().slice(-6)}`,
              quantity: numericStock,
              expirationDate: expirationDate ? new Date(expirationDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              productId: id,
            },
          });
        }
      }

      return await tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          supplier: true,
          batches: {
            where: { quantity: { gt: 0 } },
            orderBy: { expirationDate: 'asc' }
          }
        }
      });
    });
  }
}