import { Request, Response } from 'express'
import { SupplierService } from './supplier.service.js'
import { createSupplierSchema } from './supplier.schema.js'

export class SupplierController {
  static async create(req: Request, res: Response) {
    try {
      const validatedData = createSupplierSchema.parse(req.body)
      const supplier = await SupplierService.createSupplier(validatedData)
      return res.status(201).json(supplier)
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao criar fornecedor' })
    }
  }

  static async list(_req: Request, res: Response) {
    try {
      const suppliers = await SupplierService.listSuppliers()
      return res.json(suppliers)
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao listar fornecedores' })
    }
  }

  static async generateOrder(req: Request, res: Response) {
    try {
      const { supplierId } = req.params
      const orderData = await SupplierService.generateWhatsAppOrderMessage(supplierId)
      return res.json(orderData)
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao gerar pedido de compra' })
    }
  }
}