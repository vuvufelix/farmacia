import { z } from 'zod'

const itemSchema = z.object({
  productId: z.string().uuid('ID do produto inválido'),
  batchId: z.string().uuid('ID do lote inválido'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero')
})

export const createSaleSchema = z.object({
  userId: z.string().uuid('ID do utilizador/operador inválido'),
  paymentMethod: z.enum(['MONEY', 'MULTICAIXA', 'TRANSFER', 'COMBINED']),
  items: z.array(itemSchema).min(1, 'A venda precisa de pelo menos 1 item')
})

export const createReturnSchema = z.object({
  saleId: z.string().uuid('ID da venda inválido'),
  saleItemId: z.string().uuid('ID do item de venda inválido'),
  userId: z.string().uuid('ID do utilizador responsável pela troca inválido'),
  quantity: z.number().int().positive('A quantidade devolvida deve ser maior que zero'),
  reason: z.string().min(3, 'O motivo da troca deve ser detalhado')
})