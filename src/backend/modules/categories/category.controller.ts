import { Request, Response } from 'express'
import { CategoryService } from './category.service.js'

export class CategoryController {
  static async list(_req: Request, res: Response) {
    try {
      const categories = await CategoryService.listCategories()
      return res.json(categories)
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao listar categorias' })
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { name, description } = req.body
      if (!name) return res.status(400).json({ error: 'O nome da categoria é obrigatório' })
      
      const category = await CategoryService.createCategory({ name, description })
      return res.status(201).json(category)
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao criar categoria' })
    }
  }
}