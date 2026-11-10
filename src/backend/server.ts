import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { productRoutes } from './modules/products/product.routes.js'
import { saleRoutes } from './modules/sales/sale.routes.js'
import { supplierRoutes } from './modules/suppliers/supplier.routes.js'
import { LicenseService } from './modules/license/license.service.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { reportRoutes } from './modules/reports/report.routes.js'
import { categoryRoutes } from './modules/categories/category.routes.js'
import { licenseRoutes } from './modules/license/license.routes.js'
import { errorMiddleware } from './middlewares/error.middleware.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// ... depois de criar a instância 'app = express()' e definir os middlewares/cors:
const publicPath = path.join(__dirname, '../../public'); // ajuste conforme a localização do dist/public
app.use(express.static(publicPath));

app.use(cors())
app.use(express.json())

// Rota de estado do sistema e validação da licença (Segura com try/catch)
app.get('/api/health', async (_req, res) => {
  try {
    const licenseStatus = await LicenseService.getStatus()
    return res.json({
      status: 'online',
      offlineMode: true,
      license: licenseStatus
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
})

// Rotas principais do sistema (Protegidas por autenticação, sem crash de licença)
app.use('/api/license', licenseRoutes)
app.use('/api/products', productRoutes)
app.use('/api/sales', saleRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/categories', categoryRoutes)

// Middleware global de tratamento de erros
app.use(errorMiddleware)

app.use(express.static(path.resolve(__dirname, '../../public')))

export function startServer(port: number): Promise<void> {
  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`🚀 Servidor local Nenova Tech a rodar em http://localhost:${port}`)
      resolve()
    })
  })
}

if (process.env.NODE_ENV === 'development') {
  startServer(3333)
}