import { prisma } from '../../database/prisma.client.js'

export class SupplierService {
  static async createSupplier(data: any) {
    return prisma.supplier.create({ data })
  }

  static async listSuppliers() {
    return prisma.supplier.findMany({
      include: {
        _count: { select: { products: true } }
      },
      orderBy: { name: 'asc' }
    })
  }

  static async getLowStockProductsBySupplier(supplierId: string) {
    const products = await prisma.product.findMany({
      where: { supplierId },
      include: {
        batches: { where: { quantity: { gt: 0 } } },
        supplier: true
      }
    })

    const lowStockItems = []

    for (const product of products) {
      const currentStock = product.batches.reduce((acc, b) => acc + b.quantity, 0)
      if (currentStock <= product.minStock) {
        const suggestedQuantity = (product.minStock * 2) - currentStock
        lowStockItems.push({
          productId: product.id,
          productName: product.name,
          code: product.code,
          currentStock,
          minStock: product.minStock,
          suggestedQuantity: Math.max(suggestedQuantity, product.minStock)
        })
      }
    }

    return lowStockItems
  }

  static async generateWhatsAppOrderMessage(supplierId: string) {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
    if (!supplier) throw new Error('Fornecedor não encontrado')

    const itemsToOrder = await this.getLowStockProductsBySupplier(supplierId)

    if (itemsToOrder.length === 0) {
      return {
        hasItems: false,
        message: `Não há produtos abaixo do estoque mínimo para o fornecedor ${supplier.name}.`,
        whatsappUrl: null
      }
    }

    let textMessage = `*PEDIDO DE REPOSIÇÃO - NENOVA TECH*\n`
    textMessage += `*Fornecedor:* ${supplier.name}\n`
    textMessage += `*Data:* ${new Date().toLocaleDateString('pt-AO')}\n\n`
    textMessage += `Olá! Gostaria de fazer o pedido dos seguintes itens com estoque baixo:\n\n`

    itemsToOrder.forEach((item, index) => {
      textMessage += `${index + 1}. *${item.productName}*\n`
      textMessage += `   - Qtd Atual: ${item.currentStock} | Qtd Solicitada: *${item.suggestedQuantity} un*\n`
    })

    textMessage += `\nAguardo confirmação de disponibilidade e cotação. Obrigado!`

    const cleanPhone = supplier.phone.replace(/\D/g, '')
    const encodedMessage = encodeURIComponent(textMessage)
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`

    return {
      hasItems: true,
      supplierName: supplier.name,
      supplierPhone: supplier.phone,
      itemCount: itemsToOrder.length,
      rawText: textMessage,
      whatsappUrl,
      items: itemsToOrder
    }
  }
}