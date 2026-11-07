import { Request, Response } from 'express'
import { AuthService } from './auth.service.js'
import { loginSchema } from './auth.schema.js'

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = loginSchema.parse(req.body)
      const result = await AuthService.login(username, password)
      return res.json(result)
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao efetuar login' })
    }
  }
}