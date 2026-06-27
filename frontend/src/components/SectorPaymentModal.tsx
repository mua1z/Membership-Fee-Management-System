import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { getCurrentEthiopianPeriod } from '../utils/ethiopianCalendar'
import api from '../lib/api'
import { X, Upload, FileText, Loader2, CheckCircle, AlertCircle, AlertTriangle, Users, DollarSign, Banknote, Lock, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SectorPaymentModalProps {
  onClose: () => void
  onSuccess: () => void
  editPayment?: any
  mode?: 'create' | 'edit' | 'correct'
}

export default function SectorPaymentModal({ onClose, onSuccess, editPayment, mode = 'create' }: SectorPaymentModalProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [sectors, setSectors] = useState<any[]>([])
  const [sectorTypes, setSectorTypes] = useState<any[]>([])
  const [selectedSectorType, setSelectedSectorType] = useState('')
  const [selectedSectorId, setSelectedSectorId] = useState(
    editPayment ? String(editPayment.sectorUnitId) : ''
  )

  const ethPeriod = getCurrentEthiopianPeriod()
  const [billingMonth, setBillingMonth] = useState(
    editPayment ? editPayment.billingMonth : ethPeriod.month
  )
  const [billingYear, setBillingYear] = useState(
    editPayment ? editPayment.billingYear : ethPeriod.year
  )
  const [totalAmount, setTotalAmount] = useState(
    editPayment ? String(editPayment.totalAmount) : ''
  )
  const [transactionId, setTransactionId] = useState(
    editPayment ? (editPayment.transactionId || '') : ''
  )
  const [notes, setNotes] = useState(
    editPayment ? (editPayment.notes || '') : ''
  )
  
  // Admin-only financial override fields
  const [expectedRevenue, setExpectedRevenue] = useState(
    editPayment && editPayment.expectedRevenue ? String(editPayment.expectedRevenue) : ''
  )
  const [collectedAmountField, setCollectedAmountField] = useState(
    editPayment && editPayment.collectedAmount ? String(editPayment.collectedAmount) : ''
  )

  // Reason for admin editing approved payments or sector officer requesting correction
  const [reason, setReason] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [validation, setValidation] = useState<any>(null)
  const [validating, setValidating] = useState(false)

  // Load sector types and sectors if editPayment is provided
  useEffect(() => {
    api.get('/sector-types').then(res => {
      setSectorTypes(res.data)
      if (editPayment) {
        // Find sector unit details to preselect sector type
        api.get(`/sector-payments/${editPayment.id}`).then(payRes => {
          const unit = payRes.data.data?.sectorUnit
          if (unit) {
            // Find type and fetch sibling units
            api.get('/sectors').then(secRes => {
              const matchedSec = secRes.data.find((s: any) => s.id === editPayment.sectorUnitId)
              if (matchedSec) {
                setSelectedSectorType(matchedSec.sectorType?.name || '')
              }
            })
          }
        })
      }
    }).catch(() => {})

    if (user?.role === 'sector_officer' && user?.sectorUnitId) {
      setSelectedSectorId(String(user.sectorUnitId))
    }
  }, [editPayment])

  useEffect(() => {
    if (selectedSectorType && user?.role !== 'sector_officer') {
      api.get(`/sectors?type=${selectedSectorType}`).then(res => setSectors(res.data))
    } else {
      setSectors([])
    }
  }, [selectedSectorType])

  // Validation hook
  useEffect(() => {
    if (!selectedSectorId || !billingMonth || !billingYear) {
      setValidation(null)
      return
    }
    setValidating(true)
    api.get('/sector-payments/validate', {
      params: { sectorUnitId: selectedSectorId, billingMonth, billingYear, totalAmount: totalAmount || 0 }
    }).then(res => {
      setValidation(res.data.data)
    }).catch(() => {
      setValidation(null)
    }).finally(() => {
      setValidating(false)
    })
  }, [selectedSectorId, billingMonth, billingYear, totalAmount])

  const depositAmount = Number(totalAmount) || 0

  const getValidationStatusBadge = (status: string) => {
    if (status === 'VALID') return { icon: ShieldCheck, className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', label: 'VALID' }
    if (status === 'WARNING') return { icon: ShieldAlert, className: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', label: 'WARNING' }
    if (status === 'FLAGGED') return { icon: ShieldX, className: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800', label: 'FLAGGED' }
    if (status === 'INFO') return { icon: AlertCircle, className: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', label: 'INFO' }
    return { icon: AlertCircle, className: 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700', label: 'UNKNOWN' }
  }

  const vStatus = validation?.validationStatus || ''
  const vBadge = vStatus ? getValidationStatusBadge(vStatus) : null
  const isFlagged = vStatus === 'FLAGGED'
  const isWarning = vStatus === 'WARNING'
  const noMemberPayments = validation?.collectedAmount === 0 && depositAmount > 0
  
  // Submit is disabled if: loading, success, missing fields
  const isOfficerFlagged = false
  
  const isSubmittedDisabled =
    loading ||
    success ||
    isOfficerFlagged ||
    !selectedSectorId ||
    !totalAmount ||
    (mode === 'create' && !file && !transactionId) || // file or TID is required when creating
    (editPayment?.approvalStatus === 'APPROVED' && user?.role === 'admin' && mode === 'edit' && !reason.trim()) ||
    (mode === 'correct' && !reason.trim()) // correction reason is required

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const allowed = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowed.includes(f.type)) {
      setError('Only JPG, PNG, and PDF files are allowed.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.')
      return
    }
    setError('')
    setFile(f)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }

  const handleSubmit = async () => {
    if (!selectedSectorId || !totalAmount) {
      setError('Please fill all required fields.')
      return
    }
    setLoading(true)
    setError('')
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('sectorUnitId', selectedSectorId)
    formData.append('billingMonth', String(billingMonth))
    formData.append('billingYear', String(billingYear))
    formData.append('totalAmount', totalAmount)
    formData.append('bankName', 'Commercial Bank of Ethiopia')
    formData.append('notes', notes)
    if (transactionId) {
      formData.append('transactionId', transactionId)
    }
    if (file) {
      formData.append('receipt', file)
    }

    if (reason) {
      formData.append('reason', reason)
    }

    // Append admin overrides
    if (user?.role === 'admin') {
      if (expectedRevenue) formData.append('expectedRevenue', expectedRevenue)
      if (collectedAmountField) formData.append('collectedAmount', collectedAmountField)
    }

    try {
      let res
      if (mode === 'create') {
        res = await api.post('/sector-payments/upload-slip', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        })
      } else if (mode === 'correct') {
        res = await api.put(`/sector-payments/${editPayment.id}/request-correction`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        })
      } else {
        // Edit mode
        res = await api.put(`/sector-payments/${editPayment.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        })
      }

      setSuccess(true)
      if (res.data.warnings?.length) {
        setError(res.data.warnings.join(' '))
      }
      setTimeout(() => { onSuccess(); onClose() }, 1500)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Action failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const ethMonths = Array.from({ length: 13 }, (_, i) => i + 1)
  const years = Array.from({ length: 11 }, (_, i) => ethPeriod.year + 5 - i)

  const isFormReadOnly = mode === 'correct' // Sector officer correction request only updates receipt and note

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
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-500" />
              {mode === 'create' ? 'Upload Sector Payment Slip' : mode === 'correct' ? 'Submit Correction Request' : 'Edit Sector Deposit'}
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Action completed successfully!
              </div>
            )}

            {user?.role !== 'sector_officer' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Sector Type</label>
                  <select
                    value={selectedSectorType}
                    disabled={isFormReadOnly || mode === 'edit'}
                    onChange={(e) => setSelectedSectorType(e.target.value)}
                    className="input"
                  >
                    <option value="">Select sector type</option>
                    {sectorTypes.map((t_obj: any) => (
                      <option key={t_obj.id} value={t_obj.name}>{t_obj.name === 'Institution' ? t('common.institution') : t_obj.name === 'Rural Cluster' ? t('common.rural') : t_obj.name === 'Urban Woreda' ? t('common.urban') : t_obj.name === 'Secondary School' ? t('common.secondary_school') : t_obj.name === 'Health Institution' ? t('common.health_institution') : t_obj.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sector Unit <span className="text-red-500">*</span></label>
                  <select
                    value={selectedSectorId}
                    disabled={isFormReadOnly || !selectedSectorType || mode === 'edit'}
                    onChange={(e) => setSelectedSectorId(e.target.value)}
                    className="input"
                  >
                    <option value="">Select sector unit</option>
                    {sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Billing Month <span className="text-red-500">*</span></label>
                <select
                  value={billingMonth}
                  disabled={isFormReadOnly}
                  onChange={(e) => setBillingMonth(Number(e.target.value))}
                  className="input"
                >
                  {ethMonths.map(m => <option key={m} value={m}>{t(`common.eth_month_${m}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Billing Year <span className="text-red-500">*</span></label>
                <select
                  value={billingYear}
                  disabled={isFormReadOnly}
                  onChange={(e) => setBillingYear(Number(e.target.value))}
                  className="input"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Amount Paid (ETB) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={totalAmount}
                disabled={isFormReadOnly}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="input"
              />
            </div>

            {/* Admin-only direct financial validation adjustments */}
            {user?.role === 'admin' && mode === 'edit' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="col-span-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Financial Overrides</p>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">Expected Revenue Override (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={expectedRevenue}
                    onChange={(e) => setExpectedRevenue(e.target.value)}
                    placeholder="Auto-calculated"
                    className="input bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 font-sans">Collected Amount Override (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={collectedAmountField}
                    onChange={(e) => setCollectedAmountField(e.target.value)}
                    placeholder="Auto-calculated"
                    className="input bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            )}

            {/* ── Validation panel ──────────────────────────────────────── */}
            {validating && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating against sector revenue...
              </div>
            )}
            {validation && !validating && (
              <div className={`rounded-xl p-4 space-y-3 border ${
                isFlagged
                  ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                  : isWarning
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : vStatus === 'INFO'
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              }`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">Validation Status</p>
                  {vBadge && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${vBadge.className}`}>
                      <vBadge.icon className="w-3.5 h-3.5" />
                      {vBadge.label}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm font-sans">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500 text-xs">Members:</span>
                    <span className="font-semibold ml-auto">{validation.totalMembers}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-slate-500 text-xs">Paid:</span>
                    <span className="font-semibold ml-auto">{validation.paidMembers}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-slate-500 text-xs font-sans">Expected:</span>
                    <span className="font-semibold ml-auto text-xs">ETB {Number(validation.expectedRevenue).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-slate-500 text-xs font-sans">Collected:</span>
                    <span className="font-semibold ml-auto text-xs font-sans">ETB {Number(validation.collectedAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-slate-500 text-xs">Approved deposits:</span>
                    <span className="font-semibold ml-auto text-xs">ETB {Number(validation.approvedDeposits).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-slate-500 text-xs">Difference:</span>
                    {noMemberPayments ? (
                      <span className="font-semibold ml-auto text-xs text-amber-500">Pending Reconciliation</span>
                    ) : (
                      <span className={`font-semibold ml-auto text-xs ${Number(validation.validationDifference) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        ETB {Number(validation.validationDifference).toLocaleString()}
                        {Number(validation.validationDifference) > 0 ? ' (over)' : Number(validation.validationDifference) < 0 ? ' (under)' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 col-span-2 border-t pt-1.5 mt-1">
                    <Lock className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-slate-600 font-medium text-xs">Remaining:</span>
                    {noMemberPayments ? (
                      <span className="font-semibold ml-auto text-lg text-amber-500">Pending Reconciliation</span>
                    ) : (
                      <span className="font-semibold ml-auto text-lg">
                        ETB {Math.max(0, Number(validation.remainingBalance)).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {validation.isClosed && (
                  <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                    <Lock className="w-3.5 h-3.5" />
                    This period is financially closed.
                  </div>
                )}

                {noMemberPayments && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold mb-1">No member payment records have been entered for this billing period.</p>
                      <p>This deposit can still be submitted and requires administrator verification against the uploaded bank receipt.</p>
                    </div>
                  </div>
                )}

                {isFlagged && (
                  <div className="flex items-start gap-2 p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                    <ShieldX className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Flagged for review</p>
                      <p>{validation.warnings?.join(' ') || 'Financial validation discrepancy detected. This deposit will be flagged but can still be submitted for admin review.'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bank Name</label>
              <input type="text" value={editPayment?.bankName || 'Commercial Bank of Ethiopia'} disabled className="input bg-slate-50 dark:bg-slate-800 text-slate-500 font-sans" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Transaction ID (TID)</label>
              <input
                type="text"
                value={transactionId}
                disabled={isFormReadOnly}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Optional (if Direct Pay was used)"
                className="input font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Upload Receipt (JPG, PNG, PDF) {mode === 'create' && !transactionId && <span className="text-red-500">*</span>}
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 text-center hover:border-amber-400 dark:hover:border-amber-500 transition-colors cursor-pointer relative">
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-32 mx-auto rounded-lg" />
                ) : file ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <FileText className="w-5 h-5 text-amber-500" />
                    {file.name}
                  </div>
                ) : editPayment?.receiptFile ? (
                  <div className="text-xs text-slate-500">
                    <FileText className="w-6 h-6 mx-auto mb-1.5 text-amber-500" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px] mx-auto">{editPayment.receiptFile}</p>
                    <p className="text-[10px]">Click or drag to replace receipt (will upload as a new version)</p>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p>Click or drag to upload receipt</p>
                    <p className="text-[10px] mt-1 font-sans">JPG, PNG or PDF (max 5MB)</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes (Optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes..." className="input font-sans" />
            </div>

            {/* Reason input for edit-approved or request-correction */}
            {((editPayment?.approvalStatus === 'APPROVED' && user?.role === 'admin' && mode === 'edit') || mode === 'correct') && (
              <div>
                <label className="block text-xs font-bold text-red-500 uppercase tracking-wider mb-1.5">
                  Reason for modification/correction <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  required
                  placeholder="Mandatory reason for modifying an approved deposit..."
                  className="input border-red-300 focus:border-red-500 dark:border-red-900/50"
                />
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}

            <div className="flex gap-3 pt-2 font-sans">
              <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={isSubmittedDisabled}
                className={`btn flex-1 flex items-center justify-center gap-2 ${
                  isOfficerFlagged
                    ? 'bg-rose-300 dark:bg-rose-800/50 text-white cursor-not-allowed'
                    : 'btn-primary'
                }`}
                title={isOfficerFlagged ? 'Submission blocked due to financial validation failure' : ''}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {loading ? 'Processing...' : mode === 'create' ? 'Submit for Approval' : mode === 'correct' ? 'Submit Correction' : 'Save Changes'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
