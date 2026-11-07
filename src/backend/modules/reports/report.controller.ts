import { Request, Response } from 'express'
import { ReportService } from './report.service.js'

export class ReportController {
  static async getMonthlyReport(req: Request, res: Response) {
    try {
      const year = req.query.year ? Number(req.query.year) : new Date().getFullYear()
      const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1

      const report = await ReportService.getMonthlySalesAndTaxReport(year, month)
      return res.json(report)
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao gerar relatório fiscal' })
    }
  }
}