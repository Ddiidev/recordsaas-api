export type Language = 'en' | 'pt-BR'

export type Theme = 'light' | 'dark' | 'system'

export type Region = 'global' | 'br'

export type CheckoutPlan = 'pro' | 'lifetime'

export interface UserSession {
  email?: string
  name?: string
  picture?: string
}

export interface LicenseStatus {
  active: boolean
  plan?: 'pro' | 'subscription' | 'lifetime' | 'free'
  paidAmount?: number | null
  paidCurrency?: string | null
}
