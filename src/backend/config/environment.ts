import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carrega as variáveis do ficheiro .env na raiz do projeto
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 3333,
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  LICENSE_SECRET: process.env.LICENSE_SECRET || 'nenova-tech-offline-secret-key-2026',
  JWT_SECRET: process.env.JWT_SECRET || 'nenova-tech-jwt-authentication-secret-2026',
  NODE_ENV: process.env.NODE_ENV || 'development'
}