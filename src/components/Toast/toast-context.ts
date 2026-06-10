import { createContext } from 'react'

export type ToastType = 'success' | 'error'

export type ToastItem = {
  id: string
  type: ToastType
  message: string
}

export type ToastApi = {
  success: (message: string) => void
  error: (message: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)
