import { prisma } from '../../database/prisma.client.js'

export class ReportService {
  static async getMonthlySalesAndTaxReport(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    // 1. Buscar vendas do mês
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        user: { select: { name: true, username: true } },
        items: { include: { product: true } }
      }
    })

    // 2. Buscar devoluções / trocas do mês para auditoria fiscal e motivos
    const returns = await prisma.return.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        user: { select: { name: true } },
        saleItem: { include: { product: true } },
        sale: { select: { invoiceNumber: true } }
      }
    })

    let totalRevenue = 0
    let totalTaxCollected = 0
    const salesByOperator: Record<string, { count: number; total: number }> = {}

    for (const sale of sales) {
      totalRevenue += sale.total
      totalTaxCollected += sale.taxTotal

      const operatorName = sale.user.name
      if (!salesByOperator[operatorName]) {
        salesByOperator[operatorName] = { count: 0, total: 0 }
      }
      salesByOperator[operatorName].count += 1
      salesByOperator[operatorName].total += sale.total
    }

    return {
      period: `${month}/${year}`,
      totalInvoices: sales.length,
      totalRevenue,
      totalTaxCollected,
      salesByOperator,
      salesDetails: sales,
      returnsDetails: returns // <-- Inclui todas as trocas e motivos catalogados para o fecho fiscal
    }
  }
}