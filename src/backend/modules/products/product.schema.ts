import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  code: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  costPrice: z.number().positive('O preço de custo deve ser positivo'),
  sellingPrice: z.number().positive('O preço de venda deve ser positivo'),
  taxRate: z.number().min(0).default(0.0),
  taxExemption: z.string().optional(),
  minStock: z.number().int().nonnegative().default(10),
  categoryId: z.string().uuid('ID de categoria inválido'),
  supplierId: z.string().uuid('ID de fornecedor inválido').optional(),
  initialStock: z.number().int().nonnegative().optional()
})

export const updateProductSchema = createProductSchema.partial()

export const createBatchSchema = z.object({
  batchNumber: z.string().min(1, 'Número do lote é obrigatório'),
  quantity: z.number().int().positive('A quantidade deve ser maior que zero'),
  manufacturingDate: z.string().datetime().optional(),
  expirationDate: z.string().datetime('Data de validade inválida'),
  productId: z.string().uuid('ID do produto inválido')
})