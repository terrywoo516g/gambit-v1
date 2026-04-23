'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; type: ToastType; message: string }

let toastId = 0
let addToastFn: ((type: ToastType, message: string) => void) | null = null

export function toast(type: ToastType, message: string) { addToastFn?.(type, message) }
toast.success = (msg: string) => toast('success', msg)
toast.error = (msg: string) => toast('error', msg)
toast.info = (msg: string) => toast('info', msg)

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 text-green-500" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
}
const BG: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  info: 'bg-blue-50 border-blue-200',
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  useEffect(() => {
    addToastFn = (type, message) => {
      const id = ++toastId
      setToasts(prev => [...prev, { id, type, message }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
    }
    return () => { addToastFn = null }
  }, [])

  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg animate-slideInRight ${BG[t.type]}`}>
          {ICONS[t.type]}
          <span className="text-sm text-ink flex-1">{t.message}</span>
          <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="text-inkLight hover:text-ink shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  )
}