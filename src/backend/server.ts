import express from 'express'
import cors from 'cors'
import { productRoutes } from './modules/products/product.routes.js'
import { saleRoutes } from './modules/sales/sale.routes.js'
import { supplierRoutes } from './modules/suppliers/supplier.routes.js'
import { LicenseService } from './modules/license/license.service.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { reportRoutes } from './modules/reports/report.routes.js'
import { errorMiddleware } from './middlewares/error.middleware.js'

const app = express()

app.use(cors())
app.use(express.json())

// Rota de estado do sistema e validação da licença de 10.000 Kz
app.get('/api/health', async (_req, res) => {
  const licenseStatus = await LicenseService.checkStatus()
  return res.json({
    status: 'online',
    offlineMode: true,
    license: licenseStatus
  })
})

// Rota pública para ativação de licença expirada
app.post('/api/license/activate', async (req, res) => {
  try {
    const { pharmacyName, licenseKey } = req.body
    const activated = await LicenseService.activateLicense(pharmacyName, licenseKey)
    return res.json({ message: 'Licença ativada com sucesso!', license: activated })
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Falha ao ativar licença' })
  }
})

// Rotas do sistema
app.use('/api/products', productRoutes)
app.use('/api/sales', saleRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/reports', reportRoutes)
app.use(errorMiddleware)

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