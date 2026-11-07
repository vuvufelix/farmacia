import { prisma } from '../../database/prisma.client.js'

export class CategoryService {
  static async listCategories() {
    return prisma.category.findMany({
      orderBy: { name: 'asc' }
    })
  }

  static async createCategory(data: { name: string; description?: string }) {
    return prisma.category.create({ data })
  }
}