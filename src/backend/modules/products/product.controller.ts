import { Request, Response } from 'express'
import { ProductService } from './product.service.js'
import { createProductSchema, createBatchSchema } from './product.schema.js'

export class ProductController {
  static async create(req: Request, res: Response) {
    try {
      const validatedData = createProductSchema.parse(req.body)
      const product = await ProductService.createProduct(validatedData)
      return res.status(201).json(product)
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao criar produto' })
    }
  }

  static async list(_req: Request, res: Response) {
    try {
      const products = await ProductService.listProducts()
      return res.json(products)
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao listar produtos' })
    }
  }

  static async addBatch(req: Request, res: Response) {
    try {
      const validatedData = createBatchSchema.parse(req.body)
      const batch = await ProductService.addBatch(validatedData)
      return res.status(201).json(batch)
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao registar lote' })
    }
  }

  static async getAlerts(_req: Request, res: Response) {
    try {
      const alerts = await ProductService.getExpirationAlerts()
      return res.json(alerts)
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao procurar alertas de caducidade' })
    }
  }

  static async deleteProduct (req: Request, res: Response) {
    try {
      await ProductService.deleteProduct(req.params.id);
      return res.json({ message: 'Produto e lotes associados removidos com sucesso.' });
    } catch (error) {
      return res.status(400).json({ error: error });
    }
  }
}