import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/environment.js'

interface TokenPayload {
  id: string
  username: string
  role: string
  iat: number
  exp: number
}

// Estender a interface do Request do Express para incluir o user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        username: string
        role: string
      }
    }
  }
}

export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' })
  }

  const [, token] = authHeader.split(' ')

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload

    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    }

    return next()
  } catch {
    return res.status(401).json({ error: 'Token de autenticação inválido ou expirado' })
  }
}

export function ensureRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Utilizador não autenticado' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado: permissões insuficientes' })
    }

    return next()
  }
}