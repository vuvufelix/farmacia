import { Router } from 'express'
import { AuthController } from './auth.controller.js'

const authRoutes = Router()

authRoutes.post('/login', AuthController.login)

export { authRoutes }