import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import { X, Clock, User, ChevronRight, FileText, Loader2, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AuditLog {
  id: number
  sectorPaymentId: number
  userId: number | null
  actionType: string
  oldValues: Record<string, any> | null
  newValues: Record<string, any> | null
  notes: string | null
  createdAt: string
  user?: {
    fullName: string
  }
}

interface SectorPaymentAuditLogsModalProps {
  paymentId: number
  onClose: () => void
}

export default function SectorPaymentAuditLogsModal({ paymentId, onClose }: SectorPaymentAuditLogsModalProps) {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get(`/sector-payments/${paymentId}/audit-logs`)
      .then(res => {
        setLogs(res.data.data)
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load audit logs.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [paymentId])

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
      APPROVE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
      REJECT: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
      EDIT: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
      REQUEST_CORRECTION: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
      REOPEN: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800',
      REVOKE: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
    }
    return colors[action] || 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30'
  }

  const formatKeyName = (key: string) => {
    const names: Record<string, string> = {
      totalAmount: 'Total Amount',
      billingMonth: 'Billing Month',
      billingYear: 'Billing Year',
      bankName: 'Bank Name',
      notes: 'Notes',
      receiptFile: 'Receipt File',
      approvalStatus: 'Approval Status',
      expectedRevenue: 'Expected Revenue',
      collectedAmount: 'Collected Amount',
      validationDifference: 'Validation Diff',
      validationStatus: 'Validation Status'
    }
    return names[key] || key
  }

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return '—'
    if (key === 'totalAmount' || key === 'expectedRevenue' || key === 'collectedAmount' || key === 'validationDifference') {
      return `ETB ${Number(value).toLocaleString()}`
    }
    if (key === 'billingMonth') {
      return t(`common.eth_month_${value}`) || `Month ${value}`
    }
    return String(value)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Deposit Audit History
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Loading history...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center text-red-700 dark:text-red-400">
                {error}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-20 text-slate-500 dark:text-slate-400">
                No audit records found for this deposit.
              </div>
            ) : (
              <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-8">
                {logs.map((log) => (
                  <div key={log.id} className="relative">
                    {/* Circle Indicator */}
                    <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border-4 border-white dark:border-slate-900 bg-amber-500 shadow-sm" />

                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${getActionColor(log.actionType)}`}>
                          {log.actionType}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <User className="w-3.5 h-3.5" />
                          {log.user?.fullName || 'System / Auto'}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                      {log.notes && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                          "{log.notes}"
                        </p>
                      )}

                      {/* Changed values display */}
                      {log.oldValues && log.newValues && Object.keys(log.oldValues).length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modified fields</p>
                          <div className="grid gap-2">
                            {Object.keys(log.oldValues).map(key => (
                              <div key={key} className="flex items-center text-xs flex-wrap gap-1.5">
                                <span className="font-semibold text-slate-600 dark:text-slate-400 min-w-[120px]">
                                  {formatKeyName(key)}:
                                </span>
                                <span className="line-through text-slate-400 font-mono bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded">
                                  {formatValue(key, log.oldValues?.[key])}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-bold text-slate-700 dark:text-slate-200 font-mono bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                                  {formatValue(key, log.newValues?.[key])}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {log.actionType === 'CREATE' && log.newValues && (
                        <div className="text-xs text-slate-500 space-y-1">
                          <p className="font-semibold">Deposit Details:</p>
                          <p>Billing Month: {formatValue('billingMonth', log.newValues.billingMonth)}/{log.newValues.billingYear}</p>
                          <p>Amount: ETB {Number(log.newValues.totalAmount).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button onClick={onClose} className="btn btn-secondary px-6">
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
