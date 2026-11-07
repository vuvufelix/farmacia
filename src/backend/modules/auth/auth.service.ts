import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../database/prisma.client.js'
import { env } from '../../config/environment.js'

export class AuthService {
  static async login(username: string, pass: string) {
    const user = await prisma.user.findUnique({ where: { username } })

    if (!user || !user.active) {
      throw new Error('Utilizador não encontrado ou inativo')
    }

    const passwordMatch = await bcrypt.compare(pass, user.password)
    if (!passwordMatch) {
      throw new Error('Senha incorreta')
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role
      }
    }
  }
}