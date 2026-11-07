import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/errors.js'

export function errorMiddleware(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message
    })
  }

  console.error('Erro não tratado:', error)

  return res.status(500).json({
    status: 'error',
    message: 'Erro interno do servidor'
  })
}