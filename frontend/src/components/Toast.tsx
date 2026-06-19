import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  success: (title: string, message?: string, duration?: number) => string
  error: (title: string, message?: string, duration?: number) => string
  warning: (title: string, message?: string, duration?: number) => string
  info: (title: string, message?: string, duration?: number) => string
  loading: (title: string, message?: string) => string
  dismiss: (id: string) => void
  update: (id: string, type: ToastType, title: string, message?: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
}

const STYLES = {
  success: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-emerald-500/40',
    icon: 'text-emerald-500',
    bar: 'bg-emerald-500',
    title: 'text-gray-900 dark:text-white',
    badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  },
  error: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-red-500/40',
    icon: 'text-red-500',
    bar: 'bg-red-500',
    title: 'text-gray-900 dark:text-white',
    badge: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  },
  warning: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-amber-500/40',
    icon: 'text-amber-500',
    bar: 'bg-amber-500',
    title: 'text-gray-900 dark:text-white',
    badge: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  },
  info: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-blue-500/40',
    icon: 'text-blue-500',
    bar: 'bg-blue-500',
    title: 'text-gray-900 dark:text-white',
    badge: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  loading: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-400/40',
    icon: 'text-slate-500',
    bar: 'bg-slate-500',
    title: 'text-gray-900 dark:text-white',
    badge: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  },
}

const LABELS = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Notice',
  loading: 'Processing',
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = ICONS[toast.type]
  const style = STYLES[toast.type]
  const isLoading = toast.type === 'loading'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`relative w-full max-w-sm rounded-2xl border shadow-2xl shadow-black/10 overflow-hidden ${style.bg} ${style.border}`}
    >
      {/* Top color bar */}
      <div className={`h-0.5 w-full ${style.bar}`} />

      <div className="p-4 flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 ${style.icon}`}>
          <Icon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${style.badge}`}>
              {LABELS[toast.type]}
            </span>
          </div>
          <p className={`text-sm font-bold leading-snug ${style.title}`}>{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{toast.message}</p>
          )}
        </div>

        {!isLoading && (
          <button
            onClick={() => onDismiss(toast.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((type: ToastType, title: string, message?: string, duration = 4500): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts(prev => [...prev.slice(-4), { id, type, title, message, duration }])
    if (type !== 'loading' && duration > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  const update = useCallback((id: string, type: ToastType, title: string, message?: string, duration = 4500) => {
    clearTimeout(timers.current[id])
    setToasts(prev => prev.map(t => t.id === id ? { ...t, type, title, message } : t))
    if (type !== 'loading' && duration > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), duration)
    }
  }, [dismiss])

  const ctx: ToastContextValue = {
    success: (title, message, duration) => add('success', title, message, duration),
    error: (title, message, duration) => add('error', title, message, duration),
    warning: (title, message, duration) => add('warning', title, message, duration),
    info: (title, message, duration) => add('info', title, message, duration),
    loading: (title, message) => add('loading', title, message, 0),
    dismiss,
    update,
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
