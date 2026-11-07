import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Nome de utilizador é obrigatório'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres')
})