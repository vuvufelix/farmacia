export type UserRole = 'ADMIN' | 'GERENTE' | 'CAIXA' | 'CONTABILISTA'

export type PaymentMethodType = 'MONEY' | 'MULTICAIXA' | 'TRANSFER' | 'COMBINED'

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}