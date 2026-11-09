import crypto from 'crypto'
import { prisma } from '../../database/prisma.client.js'

export class SaleService {
  private static async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await prisma.sale.count()
    const sequence = String(count + 1).padStart(4, '0')
    return `FR FMN${year}/${sequence}`
  }

  private static generateSaleHash(invoiceNumber: string, total: number, createdAt: Date): string {
    const rawData = `${invoiceNumber};${total.toFixed(2)};${createdAt.toISOString()}`
    return crypto.createHash('sha256').update(rawData).digest('hex').substring(0, 16).toUpperCase()
  }

  static async createSale(data: {
    userId: string
    paymentMethod: 'MONEY' | 'MULTICAIXA' | 'TRANSFER' | 'COMBINED'
    items: Array<{ productId: string; batchId: string; quantity: number }>
  }) {
    return prisma.$transaction(async (tx: any) => {
      let subtotal = 0
      let taxTotal = 0
      const processedItems = []

      for (const item of data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product) throw new Error(`Produto não encontrado (ID: ${item.productId})`)

        const batch = await tx.batch.findUnique({ where: { id: item.batchId } })
        if (!batch) throw new Error(`Lote não encontrado (ID: ${item.batchId})`)

        if (batch.quantity < item.quantity) {
          throw new Error(`Estoque insuficiente no lote ${batch.batchNumber}. Disponível: ${batch.quantity}`)
        }

        // Baixar a quantidade no lote
        await tx.batch.update({
          where: { id: batch.id },
          data: { quantity: batch.quantity - item.quantity }
        })

        const itemSubtotal = product.sellingPrice * item.quantity
        const itemTax = itemSubtotal * product.taxRate
        const itemTotal = itemSubtotal + itemTax

        subtotal += itemSubtotal
        taxTotal += itemTax

        processedItems.push({
          productId: product.id,
          batchId: batch.id,
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          taxRate: product.taxRate,
          taxAmount: itemTax,
          subtotal: itemSubtotal,
          total: itemTotal
        })
      }

      const total = subtotal + taxTotal
      const invoiceNumber = await this.generateInvoiceNumber()
      const now = new Date()
      const hash = this.generateSaleHash(invoiceNumber, total, now)
      const qrCodeData = `NENOVA|${invoiceNumber}|${total.toFixed(2)}|${hash}`

      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          subtotal,
          taxTotal,
          total,
          paymentMethod: data.paymentMethod,
          hash,
          qrCodeData,
          userId: data.userId,
          createdAt: now,
          items: {
            create: processedItems
          }
        },
        include: {
          items: {
            include: { product: true, batch: true }
          },
          user: {
            select: { id: true, name: true, role: true }
          }
        }
      })

      return sale
    })
  }

  static async getSaleInvoice(saleId: string) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: { product: true, batch: true }
        },
        user: { select: { name: true } }
      }
    })

    if (!sale) throw new Error('Venda não encontrada')
    return sale
  }

  // 1. Novo método para encontrar a fatura de forma legível pelo número (ex: FR FMN2026/0001)
  static async getSaleByInvoiceNumber(invoiceNumber: string) {
    const sale = await prisma.sale.findUnique({
      where: { invoiceNumber: invoiceNumber.trim().toUpperCase() },
      include: {
        items: {
          include: { product: true, batch: true }
        },
        user: { select: { name: true } }
      }
    })

    if (!sale) throw new Error('Fatura não encontrada com este número')
    return sale
  }

  // 2. Método de devolução otimizado (compatível com o ID do item selecionado na interface amigável)
  static async processReturn(data: {
    saleId: string
    saleItemId: string
    userId: string
    quantity: number
    reason: string
  }) {
    return prisma.$transaction(async (tx: any) => {
      const saleItem = await tx.saleItem.findUnique({
        where: { id: data.saleItemId },
        include: { product: true, batch: true }
      })

      if (!saleItem || saleItem.saleId !== data.saleId) {
        throw new Error('Item de venda não encontrado nesta fatura')
      }

      if (data.quantity > saleItem.quantity) {
        throw new Error('Quantidade para troca/devolução superior à faturada')
      }

      // Reverter quantidade de volta ao lote (FEFO / Stock)
      await tx.batch.update({
        where: { id: saleItem.batchId },
        data: { quantity: saleItem.batch.quantity + data.quantity }
      })

      const refundAmount = saleItem.unitPrice * data.quantity * (1 + saleItem.taxRate)

      const returnRecord = await tx.return.create({
        data: {
          saleId: data.saleId,
          saleItemId: data.saleItemId,
          userId: data.userId,
          quantity: data.quantity,
          reason: data.reason,
          refundAmount
        },
        include: {
          saleItem: { include: { product: true } }
        }
      })

      return returnRecord
    })
  }

  // Listar todas as vendas para o histórico
  static async listAllSales() {
    return prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: true, batch: true }
        },
        user: { select: { name: true, role: true } }
      }
    })
  }
}