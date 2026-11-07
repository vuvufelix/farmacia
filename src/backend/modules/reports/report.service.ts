import { prisma } from '../../database/prisma.client.js'

export class ReportService {
  static async getMonthlySalesAndTaxReport(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

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
      salesDetails: sales
    }
  }
}