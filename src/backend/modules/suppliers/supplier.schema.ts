import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'O nome do fornecedor deve ter pelo menos 2 caracteres'),
  phone: z.string().min(9, 'Número de telefone/WhatsApp inválido'),
  email: z.string().email('E-mail inválido').optional(),
  address: z.string().optional(),
  nif: z.string().optional()
})

export const generateOrderSchema = z.object({
  supplierId: z.string().uuid('ID de fornecedor inválido')
})