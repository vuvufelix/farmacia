import { Request, Response } from 'express'
import { SaleService } from './sale.service.js'
import { createSaleSchema, createReturnSchema } from './sale.schema.js'

export class SaleController {
  static async create(req: Request, res: Response) {
    try {
      const validatedData = createSaleSchema.parse(req.body)
      const sale = await SaleService.createSale(validatedData)
      return res.status(201).json(sale)
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao processar a venda' })
    }
  }

  static async processReturn(req: Request, res: Response) {
    try {
      const validatedData = createReturnSchema.parse(req.body)
      const returnRecord = await SaleService.processReturn(validatedData)
      return res.status(201).json(returnRecord)
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao processar troca/devolução' })
    }
  }

  static async printInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params
      const invoice = await SaleService.getSaleInvoice(id)
      return res.json(invoice)
    } catch (error: any) {
      return res.status(404).json({ error: error.message || 'Fatura não encontrada' })
    }
  }
}