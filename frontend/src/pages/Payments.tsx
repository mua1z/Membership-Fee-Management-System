import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import PageLoader from '../components/PageLoader'
import { useAuth } from '../context/AuthContext'
import {
  Search, Filter, Plus, Download, Upload, ArrowUpDown, ChevronDown,
  Eye, Printer, X, Save, Loader2, FileText, CreditCard, Wallet, Users,
  Receipt, Calendar, CheckCircle2, AlertTriangle, Ban, Clock, Building2,
  ArrowLeft, Check, ChevronLeft, ChevronRight, Trash2, Banknote,
  Edit, History, RefreshCw, Image as ImageIcon, ShieldAlert
} from 'lucide-react'
import { getCurrentEthiopianPeriod, formatEthiopianDate } from '../utils/ethiopianCalendar'
import PaymentModal from '../components/PaymentModal'
import ReceiptModal from '../components/ReceiptModal'
import ConfirmDialog from '../components/ConfirmDialog'
import DeleteAllConfirmDialog from '../components/DeleteAllConfirmDialog'
import SectorPaymentModal from '../components/SectorPaymentModal'
import SectorDepositMethodModal from '../components/SectorDepositMethodModal'
import SectorPaymentAuditLogsModal from '../components/SectorPaymentAuditLogsModal'
import { useToast } from '../components/Toast'

interface Payment {
  _id?: string
  id?: number
  receiptId: string
  memberId: string
  amount: number
  currency: string
  frequency: string
  method: string
  paymentDate: string
  period: { month: number; year: number }
  receivedBy: string
  status: string
  member?: { 
    fullName: string; 
    branch: string;
    sectorUnit?: { name: string };
    memberCategory?: { name: string };
  }
}

interface MemberPaymentStatus {
  _id: number;
  memberId: string;
  fullName: string;
  branch: string;
  sectorUnit?: { name: string };
  memberCategory?: { name: string };
  fee: number;
  paymentStatus: 'Paid' | 'Unpaid';
  paymentDate: string | null;
  paymentId: number | null;
}

export default function Payments() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'monthly' | 'history' | 'sector'>('monthly')

  const ethPeriod = getCurrentEthiopianPeriod()
  const currentYear = ethPeriod.year
  const currentMonth = ethPeriod.month

  // History State
  const [payments, setPayments] = useState<Payment[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [summary, setSummary] = useState({ totalMembers: 0, totalMonthlyRevenue: 0, totalYearlyRevenue: 0 })

  // Monthly State
  const [members, setMembers] = useState<MemberPaymentStatus[]>([])
  const [monthlySearch, setMonthlySearch] = useState('')
  const [selectedMonthNum, setSelectedMonthNum] = useState(currentMonth)
  const [selectedYearNum, setSelectedYearNum] = useState(currentYear)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [checkedIds, setCheckedIds] = useState<Record<number, boolean>>({})

  // Shared Filters State
  const [filters, setFilters] = useState({ 
    cluster: '', 
    branch: '', 
    sector: '',
    membershipType: '', 
    paymentStatus: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)

  // Hierarchy Data
  const [sectorTypes, setSectorTypes] = useState<any[]>([])
  const [sectors, setSectors] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  // Hierarchy Selection
  const [selectedSectorType, setSelectedSectorType] = useState('')
  const [selectedSectorId, setSelectedSectorId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Pagination
  const [historyPage, setHistoryPage]   = useState(1)
  const [historyLimit, setHistoryLimit] = useState(15)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPages, setHistoryPages] = useState(0)

  const [monthlyPage, setMonthlyPage]   = useState(1)
  const [monthlyLimit, setMonthlyLimit] = useState(15)
  const [monthlyTotal, setMonthlyTotal] = useState(0)
  const [monthlyPages, setMonthlyPages] = useState(0)
  const [hasFiltered, setHasFiltered] = useState(false)

  // Payment selection for bulk operations
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<(string | number)[]>([])
  const [deletingBulkPayments, setDeletingBulkPayments] = useState(false)
  const [deletingAllPayments, setDeletingAllPayments] = useState(false)

  // Confirm dialogs
  const [confirmSaveSelected, setConfirmSaveSelected] = useState(false)
  const [confirmPayAll, setConfirmPayAll] = useState(false)
  const [confirmPayAllCount, setConfirmPayAllCount] = useState(0)
  const [pendingPayAllMembers, setPendingPayAllMembers] = useState<MemberPaymentStatus[]>([])
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<{ open: boolean; id: string | number | null }>({ open: false, id: null })
  const [confirmBulkDeletePayments, setConfirmBulkDeletePayments] = useState(false)
  const [confirmDeleteAllPayments, setConfirmDeleteAllPayments] = useState(false)

  // Sector Deposits
  const [sectorPayments, setSectorPayments] = useState<any[]>([])
  const [sectorPaymentSummary, setSectorPaymentSummary] = useState({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalAmount: 0,
    totalCorrectionRequested: 0,
    totalReopened: 0,
    totalFlagged: 0,
    remainingBalance: 0,
    collectionRate: 0
  })
  const [sectorPaymentPage, setSectorPaymentPage] = useState(1)
  const [sectorPaymentPages, setSectorPaymentPages] = useState(0)
  const [sectorPaymentTotal, setSectorPaymentTotal] = useState(0)
  const [showSectorPaymentModal, setShowSectorPaymentModal] = useState(false)
  const [showDepositMethodModal, setShowDepositMethodModal] = useState(false)
  const [editPayment, setEditPayment] = useState<any>(null)
  const [sectorModalMode, setSectorModalMode] = useState<'create' | 'edit' | 'correct'>('create')
  const [showAuditLogsModal, setShowAuditLogsModal] = useState(false)
  const [auditLogsPaymentId, setAuditLogsPaymentId] = useState<number | null>(null)
  const [previewReceiptFile, setPreviewReceiptFile] = useState<string | null>(null)
  const [approvalFilter, setApprovalFilter] = useState('')
  const [validationFilter, setValidationFilter] = useState('')

  const fetchPayments = async () => {
    if (!hasFiltered) return
    setLoading(true)
    try {
      const params: any = { page: historyPage, limit: historyLimit }
      if (historySearch) params.memberId = historySearch
      
      // Pass period for summary calculations
      params.month = selectedMonthNum
      params.year = selectedYearNum
      // New Hierarchy Params
      if (selectedSectorType) params.sectorType = selectedSectorType
      if (selectedSectorId) params.sectorId = selectedSectorId
      if (selectedCategoryId) params.categoryId = selectedCategoryId
      
      if (filters.membershipType) params.membershipType = filters.membershipType
      if (filters.paymentStatus) params.status = filters.paymentStatus
      
      const res = await api.get('/payments', { params })
      setPayments(res.data.data)
      if (res.data.summary) setSummary(res.data.summary)
      if (res.data.pagination) {
        setHistoryTotal(res.data.pagination.total)
        setHistoryPages(res.data.pagination.pages)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMonthlyStatus = async () => {
    if (!hasFiltered) return
    setLoading(true)
    try {
      const year = selectedYearNum;
      const month = selectedMonthNum;
      const params: any = { month, year, search: monthlySearch, limit: monthlyLimit, page: monthlyPage }
      
      // New Hierarchy Params
      if (selectedSectorType) params.sectorType = selectedSectorType
      if (selectedSectorId) params.sectorId = selectedSectorId
      if (selectedCategoryId) params.categoryId = selectedCategoryId
      
      if (filters.membershipType) params.membershipType = filters.membershipType
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus

      const res = await api.get('/payments/monthly-status', { params })
      setMembers(res.data.data)
      if (res.data.summary) setSummary(res.data.summary)
      if (res.data.pagination) {
        setMonthlyTotal(res.data.pagination.total)
        setMonthlyPages(res.data.pagination.pages)
      }
      
      const initialChecks: Record<number, boolean> = {}
      res.data.data.forEach((m: MemberPaymentStatus) => {
        initialChecks[m._id] = m.paymentStatus === 'Paid'
      })
      setCheckedIds(initialChecks)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSectorPayments = async (page = sectorPaymentPage) => {
    setLoading(true)
    try {
      const params: any = { page, limit: 15 }
      if (approvalFilter) params.approvalStatus = approvalFilter
      if (validationFilter) params.validationStatus = validationFilter
      if (selectedSectorId) params.sectorUnitId = selectedSectorId
      if (selectedMonthNum) params.month = selectedMonthNum
      if (selectedYearNum) params.year = selectedYearNum
      const res = await api.get('/sector-payments', { params })
      setSectorPayments(res.data.data)
      if (res.data.summary) setSectorPaymentSummary(res.data.summary)
      if (res.data.pagination) {
        setSectorPaymentTotal(res.data.pagination.total)
        setSectorPaymentPages(res.data.pagination.pages)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const notifyDashboardRefresh = () => {
    try { localStorage.setItem('dashboardRefresh', String(Date.now())) } catch {}
    window.dispatchEvent(new CustomEvent('dashboard-updated'))
  }

  const handleApproveSectorPayment = async (id: number) => {
    const toastId = toast.loading('Approving Payment...', 'Verifying and approving the sector deposit.')
    try {
      await api.put(`/sector-payments/${id}/approve`)
      toast.update(toastId, 'success', 'Payment Approved', 'The sector deposit has been successfully approved and recorded.')
      await fetchSectorPayments()
      notifyDashboardRefresh()
    } catch (err: any) {
      toast.update(toastId, 'error', 'Approval Failed', err.response?.data?.message || 'Could not approve the payment. Please try again.')
    }
  }

  const handleRejectSectorPayment = async (id: number) => {
    const reason = prompt('Please enter a reason for rejection (optional):')
    const toastId = toast.loading('Rejecting Payment...', 'Processing the rejection request.')
    try {
      await api.put(`/sector-payments/${id}/reject`, { reason })
      toast.update(toastId, 'success', 'Payment Rejected', 'The sector deposit has been marked as rejected.')
      await fetchSectorPayments()
      notifyDashboardRefresh()
    } catch (err: any) {
      toast.update(toastId, 'error', 'Rejection Failed', err.response?.data?.message || 'Could not reject the payment.')
    }
  }

  const handleReopenSectorPayment = async (id: number) => {
    const reason = prompt('Please enter a reason for reopening (optional):')
    try {
      await api.put(`/sector-payments/${id}/reopen`, { reason })
      await fetchSectorPayments()
      toast.success('Payment Reopened', 'The payment has been successfully reopened.')
    } catch (err: any) {
      toast.error('Reopen Failed', err.response?.data?.message || 'Error reopening payment')
    }
  }

  const handleRevokeSectorPayment = async (id: number) => {
    const reason = prompt('Please enter a reason for revoking approval (optional):')
    try {
      await api.put(`/sector-payments/${id}/revoke`, { reason })
      await fetchSectorPayments()
      toast.success('Approval Revoked', 'The payment approval has been revoked.')
    } catch (err: any) {
      toast.error('Revoke Failed', err.response?.data?.message || 'Error revoking approval')
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'history') {
        fetchPayments()
      } else if (activeTab === 'sector') {
        fetchSectorPayments()
      } else {
        fetchMonthlyStatus()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [activeTab, historySearch, monthlySearch, selectedMonthNum, selectedYearNum, filters, historyPage, historyLimit, monthlyPage, monthlyLimit, selectedSectorType, selectedSectorId, selectedCategoryId, hasFiltered, sectorPaymentPage, approvalFilter, validationFilter])

  // Fetch Sector Types on mount
  useEffect(() => {
    api.get('/sector-types').then(res => setSectorTypes(res.data))
  }, [])

  // Fetch Sectors when Type changes
  useEffect(() => {
    if (selectedSectorType) {
      api.get(`/sectors?type=${selectedSectorType}`).then(res => setSectors(res.data))
      setSelectedSectorId('')
    } else {
      setSectors([])
      setSelectedSectorId('')
    }
  }, [selectedSectorType])

  // Fetch Categories when Sector changes
  useEffect(() => {
    const targetSectorId = user?.role === 'sector_officer' ? user?.sectorUnitId : selectedSectorId;
    if (targetSectorId) {
      api.get(`/sectors/${targetSectorId}/categories`).then(res => setCategories(res.data))
      // Do not reset selectedCategoryId here to avoid losing filter on remount
    } else {
      setCategories([])
      setSelectedCategoryId('')
    }
  }, [selectedSectorId, user?.role, user?.sectorUnitId])

  // ── Export: Monthly Collection (filtered) ────────────────────────────────────
  const handleExportMonthly = async () => {
    setExporting(true)
    try {
      const params: any = { month: selectedMonthNum, year: selectedYearNum, search: monthlySearch, limit: 100000 }
      if (filters.cluster)       params.cluster       = filters.cluster
      if (filters.branch)        params.branch        = filters.branch
      if (filters.sector)        params.sector        = filters.sector
      if (filters.membershipType)params.membershipType = filters.membershipType
      if (filters.paymentStatus) params.paymentStatus  = filters.paymentStatus
      if (selectedSectorType)    params.sectorType     = selectedSectorType
      if (selectedSectorId)      params.sectorId       = selectedSectorId
      if (selectedCategoryId)    params.categoryId     = selectedCategoryId

      const res = await api.get('/payments/monthly-status', { params })
      const rows = (res.data.data as MemberPaymentStatus[]).map(m => ({
        'Member ID':     m.memberId,
        'Full Name':     m.fullName,
        'Sector Unit':   m.sectorUnit?.name || m.branch || '-',
        'Member Category': m.memberCategory?.name || '-',
        'Month':         selectedMonthNum,
        'Year':          selectedYearNum,
        'Due Fee (Birr)':m.fee,
        'Payment Status':m.paymentStatus,
        'Payment Date':  m.paymentDate ? formatEthiopianDate(m.paymentDate) : '-'
      }))
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Collection')
      const filterTag = [filters.branch, filters.cluster, filters.membershipType, filters.paymentStatus].filter(Boolean).join('_') || 'All'
      XLSX.writeFile(wb, `Payment-Collection-${filterTag}-${selectedYearNum}-M${selectedMonthNum}.xlsx`)
    } catch (err) { console.error(err) }
    finally { setExporting(false) }
  }

  // ── Export: Payment History (filtered) ────────────────────────────────────────
  const handleExportHistory = async () => {
    setExporting(true)
    try {
      const params: any = { page: 1, limit: 100000 }
      if (historySearch)          params.memberId      = historySearch
      if (filters.cluster)        params.cluster       = filters.cluster
      if (filters.branch)         params.branch        = filters.branch
      if (filters.sector)         params.sector        = filters.sector
      if (filters.membershipType) params.membershipType = filters.membershipType
      if (filters.paymentStatus)  params.status        = filters.paymentStatus
      if (selectedSectorType)     params.sectorType    = selectedSectorType
      if (selectedSectorId)       params.sectorId      = selectedSectorId
      if (selectedCategoryId)     params.categoryId    = selectedCategoryId

      const res = await api.get('/payments', { params })
      const rows = (res.data.data as Payment[]).map(p => ({
        'Receipt ID':    p.receiptId,
        'Member ID':     p.memberId,
        'Member Name':   p.member?.fullName || '-',
        'Sector Unit':   p.member?.sectorUnit?.name || p.member?.branch || '-',
        'Member Category': p.member?.memberCategory?.name || '-',
        'Amount (Birr)': p.amount,
        'Method':        p.method,
        'Period Month':  p.period?.month,
        'Period Year':   p.period?.year,
        'Payment Date':  p.paymentDate ? formatEthiopianDate(p.paymentDate) : '-',
        'Status':        p.status,
        'Received By':   p.receivedBy
      }))
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Payment History')
      const filterTag = [filters.branch, filters.cluster, filters.membershipType, filters.paymentStatus].filter(Boolean).join('_') || 'All'
      XLSX.writeFile(wb, `Payment-History-${filterTag}-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (err) { console.error(err) }
    finally { setExporting(false) }
  }

  const toggleCheck = (id: number) => {
    const member = members.find(m => m._id === id)
    if (member?.paymentStatus === 'Paid') return
    
    setCheckedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleToggleAll = () => {
    const unpaidMembers = members.filter(m => m.paymentStatus === 'Unpaid')
    const allCurrentlyChecked = unpaidMembers.every(m => checkedIds[m._id])
    
    const nextChecks = { ...checkedIds }
    unpaidMembers.forEach(m => {
      nextChecks[m._id] = !allCurrentlyChecked
    })
    setCheckedIds(nextChecks)
  }

  const handleSavePayment = async (member: MemberPaymentStatus) => {
    if (member.paymentStatus === 'Paid') return
    if (!checkedIds[member._id]) {
      toast.warning('Payment Not Checked', `Please mark ${member.fullName}'s payment as paid before saving.`)
      return
    }
    setSavingId(member._id)
    const toastId = toast.loading('Recording Payment...', `Saving payment for ${member.fullName}.`)
    try {
      const year = selectedYearNum;
      const month = selectedMonthNum;
      const res = await api.post('/payments', {
        member: member.memberId,
        amount: member.fee,
        method: 'Cash',
        paymentDate: new Date().toISOString(),
        periodMonth: Number(month),
        periodYear: Number(year),
        receivedBy: user?.role === 'sector_officer' ? 'Sector Officer' : 'Admin',
        status: 'Paid'
      })
      toast.update(toastId, 'success', 'Payment Recorded', `${member.fullName}'s payment of ${member.fee.toLocaleString()} ETB has been successfully recorded.`)
      await fetchMonthlyStatus()
      if (res.data.data?.receiptId) {
        setSelectedReceiptId(res.data.data.receiptId)
      }
    } catch(err: any) {
      toast.update(toastId, 'error', 'Payment Failed', err.response?.data?.message || 'Could not record the payment. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  const handleSaveSelected = async () => {
    const selectedMembers = members.filter(m => checkedIds[m._id] && m.paymentStatus === 'Unpaid')
    if (selectedMembers.length === 0) return
    setConfirmSaveSelected(true)
  }

  const doSaveSelected = async () => {
    setConfirmSaveSelected(false)
    const selectedMembers = members.filter(m => checkedIds[m._id] && m.paymentStatus === 'Unpaid')
    setLoading(true)
    const toastId = toast.loading(`Recording ${selectedMembers.length} Payments...`, 'Processing bulk payment recording.')
    try {
      const payload = selectedMembers.map(member => ({
        member: member.memberId,
        amount: member.fee,
        method: 'Cash',
        paymentDate: new Date().toISOString(),
        periodMonth: Number(selectedMonthNum),
        periodYear: Number(selectedYearNum),
        receivedBy: user?.role === 'sector_officer' ? 'Sector Officer' : 'Admin',
        status: 'Paid'
      }))
      await api.post('/payments/bulk', payload)
      toast.update(toastId, 'success', `${selectedMembers.length} Payments Recorded`, `Successfully recorded payments for ${selectedMembers.length} members.`)
      await fetchMonthlyStatus()
    } catch (err: any) {
      toast.update(toastId, 'error', 'Bulk Payment Failed', err.response?.data?.message || 'Could not record bulk payments. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePayAllFiltered = async () => {
    setLoading(true)
    try {
      const params: any = { month: selectedMonthNum, year: selectedYearNum, search: monthlySearch, limit: 100000 }
      if (filters.cluster)       params.cluster       = filters.cluster
      if (filters.branch)        params.branch        = filters.branch
      if (filters.sector)        params.sector        = filters.sector
      if (filters.membershipType)params.membershipType = filters.membershipType
      if (filters.paymentStatus) params.paymentStatus  = filters.paymentStatus
      if (selectedSectorType)    params.sectorType     = selectedSectorType
      if (selectedSectorId)      params.sectorId       = selectedSectorId
      if (selectedCategoryId)    params.categoryId     = selectedCategoryId

      const res = await api.get('/payments/monthly-status', { params })
      const allMembers = res.data.data as MemberPaymentStatus[]
      const unpaidMembers = allMembers.filter(m => m.paymentStatus === 'Unpaid')

      if (unpaidMembers.length === 0) { setLoading(false); return }

      setPendingPayAllMembers(unpaidMembers)
      setConfirmPayAllCount(unpaidMembers.length)
      setConfirmPayAll(true)
      setLoading(false)
    } catch (err: any) {
      console.error(err)
      setLoading(false)
    }
  }

  const doPayAll = async () => {
    setConfirmPayAll(false)
    setLoading(true)
    const toastId = toast.loading(`Paying All ${pendingPayAllMembers.length} Members...`, 'Processing full bulk payment for all unpaid members.')
    try {
      const payload = pendingPayAllMembers.map(member => ({
        member: member.memberId,
        amount: member.fee,
        method: 'Cash',
        paymentDate: new Date().toISOString(),
        periodMonth: Number(selectedMonthNum),
        periodYear: Number(selectedYearNum),
        receivedBy: user?.role === 'sector_officer' ? 'Sector Officer' : 'Admin',
        status: 'Paid'
      }))
      await api.post('/payments/bulk', payload)
      toast.update(toastId, 'success', `All Payments Recorded`, `Successfully recorded payments for all ${pendingPayAllMembers.length} unpaid members.`)
      await fetchMonthlyStatus()
    } catch (err: any) {
      toast.update(toastId, 'error', 'Bulk Payment Failed', err.response?.data?.message || 'Could not process all payments.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePayment = async (paymentId: string | number) => {
    setConfirmDeletePayment({ open: true, id: paymentId })
  }

  const doDeletePayment = async () => {
    const paymentId = confirmDeletePayment.id
    setConfirmDeletePayment({ open: false, id: null })
    if (!paymentId) return
    try {
      await api.delete(`/payments/${paymentId}`);
      if (activeTab === 'monthly') fetchMonthlyStatus();
      else fetchPayments();
    } catch (err: any) {
      console.error(err);
    }
  }

  // Payment bulk selection handlers
  const toggleSelectPayment = (id: string | number) => {
    setSelectedPaymentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const renderPaymentRow = (payment: any) => (
    <tr key={payment._id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedPaymentIds.includes(payment.id || payment._id || '') ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
      <td>
        <input
          type="checkbox"
          checked={selectedPaymentIds.includes(payment.id || payment._id || '')}
          onChange={() => toggleSelectPayment(payment.id || payment._id || '')}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
      </td>
      <td className="font-mono text-xs">{payment.receiptId}</td>
      <td>
        <div>
          <p className="font-bold">{payment.member?.fullName || payment.memberId}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{payment.member?.branch}</p>
        </div>
      </td>
      <td className="font-bold">{payment.amount.toLocaleString()}</td>
      <td>{payment.currency}</td>
      <td>{getMethodBadge(payment.method)}</td>
      <td>{payment.paymentDate ? formatEthiopianDate(payment.paymentDate) : '-'}</td>
      <td>{payment.receivedBy === 'System Admin' || payment.receivedBy === 'Bulk Collection' ? 'Admin' : payment.receivedBy || 'Admin'}</td>
      <td>
        <div className="flex items-center gap-2">
          {getStatusBadge(payment.status)}
          <button 
            onClick={() => setSelectedReceiptId(payment.receiptId)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-primary transition-colors"
            title={t('common.view_receipt')}
          >
            <FileText className="w-4 h-4" />
          </button>
          {user?.role !== 'expert' && (
            <button
              onClick={() => handleDeletePayment(payment.id || payment._id || '')}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded transition-colors"
              title={t('common.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )

  const toggleSelectAllPayments = () => {
    const currentIds = payments.map(p => p.id || p._id || '')
    if (selectedPaymentIds.length === currentIds.length && currentIds.length > 0) {
      setSelectedPaymentIds([])
    } else {
      setSelectedPaymentIds(currentIds)
    }
  }

  const handleBulkDeletePayments = () => {
    if (selectedPaymentIds.length === 0) return
    setConfirmBulkDeletePayments(true)
  }

  const doBulkDeletePayments = async () => {
    setConfirmBulkDeletePayments(false)
    setDeletingBulkPayments(true)
    try {
      await api.delete('/payments/bulk-delete', { data: { ids: selectedPaymentIds } })
      setSelectedPaymentIds([])
      if (activeTab === 'monthly') fetchMonthlyStatus()
      else fetchPayments()
    } catch (error: any) {
      console.error(error)
    } finally {
      setDeletingBulkPayments(false)
    }
  }

  const handleDeleteAllPayments = () => {
    setConfirmDeleteAllPayments(true)
  }

  const doDeleteAllPayments = async () => {
    setConfirmDeleteAllPayments(false)
    setDeletingAllPayments(true)
    try {
      await api.delete('/payments/delete-all')
      setSelectedPaymentIds([])
      if (activeTab === 'monthly') fetchMonthlyStatus()
      else fetchPayments()
    } catch (error: any) {
      console.error(error)
    } finally {
      setDeletingAllPayments(false)
    }
  }

  // Clear selection when payments list changes
  useEffect(() => {
    setSelectedPaymentIds([])
  }, [payments])

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      'Cash': 'badge-success',
      'Bank Transfer': 'badge-info',
      'Mobile Money': 'badge-warning',
      'Check': 'badge-secondary'
    }
    return <span className={`badge ${colors[method] || 'badge-info'}`}>{method}</span>
  }

  const getStatusBadge = (status: string) => {
    if (status === 'Unpaid') return <span className="badge badge-error">{t('common.unpaid')}</span>
    const colors: Record<string, string> = {
      'Paid': 'badge-success',
      'Partial': 'badge-warning',
      'Overpaid': 'badge-info'
    }
    return <span className={`badge ${colors[status] || 'badge-info'}`}>{status}</span>
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5 }} 
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('common.payments')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('common.payment_history')}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'sector' && (
            <button
              onClick={() => { setEditPayment(null); setSectorModalMode('create'); setShowDepositMethodModal(true) }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {t('common.upload_sector_payment_slip')}
            </button>
          )}
          <button
            onClick={activeTab === 'monthly' ? handleExportMonthly : activeTab === 'history' ? handleExportHistory : undefined}
            disabled={exporting || activeTab === 'sector'}
            className="btn btn-secondary flex items-center gap-2"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? t('common.loading') : t('common.export')}
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`pb-4 px-1 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'monthly'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('common.monthly_collection')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-4 px-1 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('common.payment_history')}
          </button>
          <button
            onClick={() => setActiveTab('sector')}
            className={`pb-4 px-1 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'sector'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sector Deposits
          </button>
        </nav>
      </div>

      {/* Top Search & Filter Bar */}
      <div className="card flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={activeTab === 'monthly' ? monthlySearch : historySearch}
            onChange={(e) => activeTab === 'monthly' ? setMonthlySearch(e.target.value) : setHistorySearch(e.target.value)}
            placeholder={t('common.search') + "..."}
            className="input pl-10 w-full"
          />
        </div>
        
        <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-2/3">
          {activeTab === 'monthly' && (
            <button onClick={() => navigate(-1)} className="btn btn-secondary flex items-center gap-2" title={t('common.back')}>
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.back')}</span>
            </button>
          )}

          <button onClick={() => setShowFilters(!showFilters)} className={`btn btn-secondary flex items-center gap-2 ${showFilters ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title={t('common.filter')}>
            <Filter className="w-4 h-4" />
            {t('common.filter')}
          </button>
          
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
          <label className="font-bold whitespace-nowrap text-xs text-gray-500 uppercase tracking-wider hidden md:block">{t('common.billing_period')}:</label>
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1">
            <select value={selectedMonthNum} onChange={(e) => setSelectedMonthNum(Number(e.target.value))} className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer">
              {Array.from({ length: 13 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{t(`common.eth_month_${m}`)}</option>
              ))}
            </select>
            <select value={selectedYearNum} onChange={(e) => setSelectedYearNum(Number(e.target.value))} className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer">
              {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="card space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {user?.role !== 'sector_officer' && (
              <select
                value={selectedSectorType}
                onChange={(e) => {
                  setSelectedSectorType(e.target.value);
                  setSelectedSectorId('');
                  setSelectedCategoryId('');
                  setMonthlyPage(1); setHistoryPage(1);
                }}
                className="input"
              >
                <option value="">{t('common.sector_type')}</option>
                {sectorTypes.map(t_obj => (
                  <option key={t_obj.id} value={t_obj.name}>
                    {t_obj.name === 'Institution' ? t('common.institution')
                      : t_obj.name === 'Rural Cluster' ? t('common.rural')
                      : t_obj.name === 'Urban Woreda' ? t('common.urban')
                      : t_obj.name === 'Secondary School' ? t('common.secondary_school')
                      : t_obj.name === 'Health Institution' ? t('common.health_institution')
                      : t_obj.name}
                  </option>
                ))}
              </select>
            )}

            {user?.role !== 'sector_officer' && (
              <select
                value={selectedSectorId}
                disabled={!selectedSectorType}
                onChange={(e) => {
                  setSelectedSectorId(e.target.value);
                  setSelectedCategoryId('');
                  setMonthlyPage(1); setHistoryPage(1);
                }}
                className="input"
              >
                <option value="">
                  {selectedSectorType
                    ? (selectedSectorType === 'Institution' ? t('common.institution') : selectedSectorType === 'Rural Cluster' ? t('common.rural') : selectedSectorType === 'Urban Woreda' ? t('common.urban') : selectedSectorType === 'Secondary School' ? t('common.secondary_school') : selectedSectorType === 'Health Institution' ? t('common.health_institution') : selectedSectorType)
                    : t('common.sector_unit')}
                </option>
                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}

            <select
              value={selectedCategoryId}
              disabled={user?.role !== 'sector_officer' && !selectedSectorId}
              onChange={(e) => { setSelectedCategoryId(e.target.value); setMonthlyPage(1); setHistoryPage(1); }}
              className="input"
            >
              <option value="">{t('common.category')}</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>


            <select
              value={filters.membershipType}
              onChange={(e) => { setFilters(prev => ({ ...prev, membershipType: e.target.value })); setMonthlyPage(1); setHistoryPage(1); }}
              className="input"
            >
              <option value="">{t('common_ui.all')}</option>
              <option value="Salary-Based">{t('common.salary')}</option>
              <option value="Non-Salary">Non-Salary</option>
              <option value="Business">{t('common.business_type')}</option>
              <option value="Investor">{t('common.investor_tiers')}</option>
              <option value="Student">Student</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filters.paymentStatus}
              onChange={(e) => { setFilters(prev => ({ ...prev, paymentStatus: e.target.value })); setMonthlyPage(1); setHistoryPage(1); }}
              className="input"
            >
              <option value="">{t('common.payment_status')}</option>
              <option value="Paid">{t('common.paid')}</option>
              <option value="Unpaid">{t('common.unpaid')}</option>
              <option value="Defaulted">{t('common.inactive')}</option>
            </select>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => { setHasFiltered(true); if(activeTab==='monthly') setMonthlyPage(1); else setHistoryPage(1); }}
                className="btn btn-primary px-6"
              >
                {t('common.display_payments')}
              </button>
              <button
                onClick={() => {
                  setSelectedSectorType(''); setSelectedSectorId(''); setSelectedCategoryId('');
                  setFilters({ cluster:'', branch:'', sector:'', membershipType:'', paymentStatus:'' });
                  setMonthlySearch(''); setHistorySearch('');
                  setHasFiltered(false); setPayments([]); setMembers([]);
                  setSummary({ totalMembers:0, totalMonthlyRevenue:0, totalYearlyRevenue:0 });
                }}
                className="btn btn-secondary px-6"
              >
                {t('common.clear_filters')}
              </button>
            </div>
          </div>
        </div>
      )}

      {!hasFiltered ? (
        <div className="card py-20 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('common.filter')}...</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Please choose your desired filters above and click '{t('common.display_payments')}' to fetch the records from the database.
          </p>
        </div>
      ) : (
      <div className="space-y-4">
      {/* Metrics Summary */}
      {activeTab !== 'sector' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {[
            { label: t('common.total_members'), value: summary.totalMembers.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: t('common.monthly_revenue'), value: `${Number(summary.totalMonthlyRevenue).toLocaleString()} ETB`, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: t('common.yearly_revenue'), value: `${Number(summary.totalYearlyRevenue).toLocaleString()} ETB`, icon: Banknote, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' }
          ].map(s => (
            <div key={s.label} className="card flex items-center gap-4">
              <div className={`p-3 rounded-lg ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly Collection - Member List */}
      {activeTab !== 'history' && activeTab !== 'sector' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {/* Action Toolbar */}
          {members.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleAll}
                  className="btn btn-secondary text-xs px-3 py-1.5"
                >
                  {members.filter(m => m.paymentStatus === 'Unpaid').every(m => checkedIds[m._id])
                    ? 'Uncheck All'
                    : 'Check All Unpaid'}
                </button>
                <button
                  onClick={handleSaveSelected}
                  disabled={members.filter(m => checkedIds[m._id] && m.paymentStatus === 'Unpaid').length === 0}
                  className="btn btn-primary text-xs px-3 py-1.5"
                >
                  Save Selected ({members.filter(m => checkedIds[m._id] && m.paymentStatus === 'Unpaid').length})
                </button>
                <button
                  onClick={handlePayAllFiltered}
                  className="btn btn-primary text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  Pay All Unpaid
                </button>
              </div>
              <span className="text-xs text-slate-500">
                {members.filter(m => m.paymentStatus === 'Paid').length} Paid / {members.length} Total
              </span>
            </div>
          )}

          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="w-10">#</th>
                  <th>{t('common.member_id')}</th>
                  <th>{t('common.full_name')}</th>
                  <th>{t('common.branch')}</th>
                  <th>{t('common.fee')}</th>
                  <th>{t('common.payment_status')}</th>
                  <th>{t('common.payment_date')}</th>
                  <th className="w-24 text-center">{t('common.action')}</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative flex items-center justify-center">
                          <div className="w-16 h-16 border-2 border-[#FFD700]/10 rounded-full"></div>
                          <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-[#FFD700] border-r-[#D4AF37]/40 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
                          <img src="/pp-logo.png" alt="logo" className="absolute w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#D4AF37]">{t('common.loading')}...</p>
                      </div>
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      {t('common.no_members_found') || 'No members found'}
                    </td>
                  </tr>
                ) : (
                  members.map((member, idx) => (
                    <tr key={member._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="text-xs text-gray-400">{((monthlyPage - 1) * monthlyLimit) + idx + 1}</td>
                      <td className="text-xs font-mono">{member.memberId}</td>
                      <td className="text-sm font-bold">{member.fullName}</td>
                      <td className="text-xs">{member.branch}</td>
                      <td className="text-sm font-bold">ETB {Number(member.fee).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${member.paymentStatus === 'Paid' ? 'badge-success' : 'badge-error'}`}>
                          {member.paymentStatus === 'Paid' ? t('common.paid') : t('common.unpaid')}
                        </span>
                      </td>
                      <td className="text-xs">
                        {member.paymentDate ? formatEthiopianDate(member.paymentDate) : '-'}
                      </td>
                      <td className="text-center">
                        {member.paymentStatus === 'Unpaid' ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="checkbox"
                              checked={!!checkedIds[member._id]}
                              onChange={() => setCheckedIds(prev => ({ ...prev, [member._id]: !prev[member._id] }))}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <button
                              onClick={() => handleSavePayment(member)}
                              disabled={savingId === member._id}
                              className="btn btn-primary text-[10px] px-2 py-1"
                            >
                              {savingId === member._id ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                t('common.save') || 'Save'
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold">
                            <CheckCircle2 className="w-4 h-4 inline mr-1" />
                            {t('common.recorded') || 'Recorded'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Monthly Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {monthlyTotal === 0
                ? (t('common.no_members_found') || 'No members found')
                : `Showing ${((monthlyPage - 1) * monthlyLimit) + 1}–${Math.min(monthlyPage * monthlyLimit, monthlyTotal)} of ${monthlyTotal} members`
              }
            </p>
            <div className="flex items-center gap-1">
              <button disabled={monthlyPage === 1} onClick={() => setMonthlyPage(1)} className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-50">«</button>
              <button disabled={monthlyPage === 1} onClick={() => setMonthlyPage(p => p - 1)} className="btn btn-secondary px-2 py-1 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: Math.min(5, monthlyPages) }, (_, i) => {
                let start = Math.max(1, monthlyPage - 2)
                const end = Math.min(monthlyPages, start + 4)
                start = Math.max(1, end - 4)
                return start + i
              }).filter(p => p >= 1 && p <= monthlyPages).map(p => (
                <button key={p} onClick={() => setMonthlyPage(p)} className={`btn px-3 py-1 text-sm ${p === monthlyPage ? 'btn-primary' : 'btn-secondary'}`}>{p}</button>
              ))}
              <button disabled={monthlyPage >= monthlyPages || monthlyPages === 0} onClick={() => setMonthlyPage(p => p + 1)} className="btn btn-secondary px-2 py-1 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
              <button disabled={monthlyPage >= monthlyPages || monthlyPages === 0} onClick={() => setMonthlyPage(monthlyPages)} className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-50">»</button>
              <select value={monthlyLimit} onChange={(e) => { setMonthlyLimit(Number(e.target.value)); setMonthlyPage(1) }} className="input ml-2 py-1 text-sm w-24">
                {[15, 25, 50, 100].map(n => <option key={n} value={n}>{n} {t('common.per_page')}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {selectedPaymentIds.length > 0 && (
            <div className="bg-blue-600 dark:bg-blue-700 text-white p-4 rounded-xl shadow-lg mb-4 flex items-center justify-between animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-lg">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold">{selectedPaymentIds.length} {t('common.payments')} {t('common.selected')}</p>
                  <p className="text-[10px] text-blue-100 uppercase tracking-widest font-bold">{t('common.manage_multiple_records')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {user?.role === 'admin' && (
                <button
                  onClick={handleBulkDeletePayments}
                  disabled={deletingBulkPayments}
                  className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  {deletingBulkPayments ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Selected
                </button>
                )}
                {user?.role === 'admin' && (
                  <button
                    onClick={handleDeleteAllPayments}
                    disabled={deletingAllPayments}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl shadow-red-900/20"
                  >
                    {deletingAllPayments ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                    Delete All
                  </button>
                )}
                <button
                  onClick={() => setSelectedPaymentIds([])}
                  className="text-white/70 hover:text-white p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedPaymentIds.length === payments.length && payments.length > 0}
                      onChange={toggleSelectAllPayments}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th>Receipt ID</th>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Received By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {loading ? (
                  <tr><td colSpan={10} className="py-20 text-center"><div className="flex flex-col items-center gap-4"><div className="relative flex items-center justify-center"><div className="w-16 h-16 border-2 border-[#FFD700]/10 rounded-full"></div><div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-[#FFD700] border-r-[#D4AF37]/40 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div><img src="/pp-logo.png" alt="logo" className="absolute w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]" style={{ animation: 'pulse 2s ease-in-out infinite' }} /></div><p className="text-[10px] font-bold uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#D4AF37]">{t('common.loading')}...</p></div></td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-gray-500">{t('common.no_data')}</td></tr>
                ) : (
                  payments.map(p => renderPaymentRow(p))
                )}
                </tbody>
              </table>
            </div>
          {/* History Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {historyTotal === 0 ? t('common.no_data') : t('table.showing', { start: ((historyPage - 1) * historyLimit) + 1, end: Math.min(historyPage * historyLimit, historyTotal), total: historyTotal })}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={historyPage === 1} onClick={() => setHistoryPage(1)} className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-50">«</button>
              <button disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)} className="btn btn-secondary px-2 py-1 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: Math.min(5, historyPages) }, (_, i) => {
                let start = Math.max(1, historyPage - 2)
                const end = Math.min(historyPages, start + 4)
                start = Math.max(1, end - 4)
                return start + i
              }).filter(p => p >= 1 && p <= historyPages).map(p => (
                <button key={p} onClick={() => setHistoryPage(p)} className={`btn px-3 py-1 text-sm ${p === historyPage ? 'btn-primary' : 'btn-secondary'}`}>{p}</button>
              ))}
              <button disabled={historyPage >= historyPages || historyPages === 0} onClick={() => setHistoryPage(p => p + 1)} className="btn btn-secondary px-2 py-1 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
              <button disabled={historyPage >= historyPages || historyPages === 0} onClick={() => setHistoryPage(historyPages)} className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-50">»</button>
              <select value={historyLimit} onChange={(e) => { setHistoryLimit(Number(e.target.value)); setHistoryPage(1) }} className="input ml-2 py-1 text-sm w-24">
                {[15, 25, 50, 100].map(n => <option key={n} value={n}>{n} {t('common.per_page')}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'sector' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card border-b-2 border-blue-200 dark:border-blue-900/30">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-sans">{t('common.total_deposited')}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">ETB {Number(sectorPaymentSummary.totalAmount).toLocaleString()}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{t('common.approved_deposits')}</p>
            </div>
            <div className="card border-b-2 border-emerald-200 dark:border-emerald-900/30">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-sans">{t('common.remaining_balance')}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">ETB {Number(sectorPaymentSummary.remainingBalance).toLocaleString()}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{t('common.collection_deposits')}</p>
            </div>
            <div className="card border-b-2 border-[var(--gold)]/30">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-sans">{t('common.payment_percentage')}</p>
              <p className="text-xl font-black text-emerald-600">{sectorPaymentSummary.collectionRate}%</p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-sans">{t('common.paid_members_rate')}</p>
            </div>
            <div className="card border-b-2 border-amber-200 dark:border-amber-900/30">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-sans">{t('common.pending_approvals')}</p>
              <p className="text-xl font-black text-amber-600">{sectorPaymentSummary.totalPending}</p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-sans">{t('common.awaiting_review')} • {sectorPaymentSummary.totalApproved} {t('common.approved')}</p>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">{t('common.filter')}:</span>
            {[
              { key: '', label: t('common_ui.all') },
              { key: 'PENDING', label: `${t('common.pending')} (${sectorPaymentSummary.totalPending})` },
              { key: 'APPROVED', label: `${t('common.approved')} (${sectorPaymentSummary.totalApproved})` },
              { key: 'REJECTED', label: `${t('common.rejected')} (${sectorPaymentSummary.totalRejected})` },
              { key: 'CORRECTION_REQUESTED', label: `Correction (${sectorPaymentSummary.totalCorrectionRequested})` },
              { key: 'REOPENED', label: `Reopened (${sectorPaymentSummary.totalReopened})` },
              { key: 'FLAGGED', label: `Flagged (${sectorPaymentSummary.totalFlagged})` },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => { setApprovalFilter(f.key); setSectorPaymentPage(1) }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  approvalFilter === f.key
                    ? 'bg-[var(--gold)] text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="table-container">
            <table className="table">
              <thead className="table-header font-sans">
                <tr>
                  <th>Period</th>
                  <th>Sector Unit</th>
                  <th>Amount (ETB)</th>
                  <th>Approval Status</th>
                  <th>Validation</th>
                  <th>Receipt</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                  <th className="text-right">{t('common.action')}</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative flex items-center justify-center">
                          <div className="w-16 h-16 border-2 border-[#FFD700]/10 rounded-full"></div>
                          <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-[#FFD700] border-r-[#D4AF37]/40 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
                          <img src="/pp-logo.png" alt="logo" className="absolute w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#D4AF37]">{t('common.loading')}...</p>
                      </div>
                    </td>
                  </tr>
                ) : sectorPayments.length === 0 ? (
                  <tr key="empty">
                    <td colSpan={10} className="text-center py-8 text-gray-500 font-sans">
                      No sector deposits found. Click "Upload Sector Payment Slip" to create one.
                    </td>
                  </tr>
                ) : (
                  sectorPayments.map((sp) => (
                    <tr key={sp._id || sp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="font-bold text-xs font-sans">
                        {t(`common.eth_month_${sp.billingMonth}`)} {sp.billingYear}
                      </td>
                      <td className="text-xs font-sans">{sp.sectorUnit?.name || sp.sectorUnitId}</td>
                      <td className="font-bold text-sm">{Number(sp.totalAmount).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${
                          sp.approvalStatus === 'APPROVED' ? 'badge-success' :
                          sp.approvalStatus === 'REJECTED' ? 'badge-error' :
                          sp.approvalStatus === 'PENDING' ? 'badge-warning' :
                          sp.approvalStatus === 'CORRECTION_REQUESTED' ? 'badge-info' :
                          sp.approvalStatus === 'REOPENED' ? 'badge-secondary' :
                          sp.approvalStatus === 'FLAGGED' ? 'badge-error' : 'badge-secondary'
                        }`}>
                          {sp.approvalStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          sp.validationStatus === 'VALID' ? 'badge-success' :
                          sp.validationStatus === 'WARNING' ? 'badge-warning' :
                          sp.validationStatus === 'FLAGGED' ? 'badge-error' : 'badge-secondary'
                        }`}>
                          {sp.validationStatus || 'N/A'}
                        </span>
                      </td>
                      <td>
                        {sp.transactionId ? (
                           <span className="text-xs font-bold font-sans text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                             TID: {sp.transactionId}
                           </span>
                        ) : sp.receiptFile ? (
                          <a
                            href={`/uploads/receipts/${sp.receiptFile}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 text-xs font-bold flex items-center gap-1 font-sans"
                            title={t('common.view_receipt')}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {sp.receiptFile.split('-').pop()}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 font-sans">{t('common.no_data')}</span>
                        )}
                      </td>
                      <td className="text-xs font-sans">{sp.uploader?.fullName || '-'}</td>
                      <td className="text-xs font-sans">{new Date(sp.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setAuditLogsPaymentId(sp._id || sp.id); setShowAuditLogsModal(true) }}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-primary transition-colors"
                            title={t('common.payment_history')}
                          >
                            <History className="w-4 h-4" />
                          </button>
                          {(user?.role === 'admin' || user?.role === 'sector_officer') && (sp.approvalStatus === 'PENDING' || sp.approvalStatus === 'FLAGGED' || sp.approvalStatus === 'REJECTED' || sp.approvalStatus === 'REOPENED' || (sp.approvalStatus === 'CORRECTION_REQUESTED' && user?.role === 'admin')) && (
                            <button
                              onClick={() => { setEditPayment(sp); setSectorModalMode('edit'); setShowSectorPaymentModal(true) }}
                              className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600 rounded transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {user?.role === 'sector_officer' && sp.approvalStatus === 'APPROVED' && (
                            <button
                              onClick={() => { setEditPayment(sp); setSectorModalMode('correct'); setShowSectorPaymentModal(true) }}
                              className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/20 text-amber-600 rounded transition-colors"
                              title={t('common.edit')}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {user?.role === 'admin' && (sp.approvalStatus === 'PENDING' || sp.approvalStatus === 'FLAGGED' || sp.approvalStatus === 'REOPENED' || sp.approvalStatus === 'CORRECTION_REQUESTED') && (
                            <span className="flex items-center gap-1">
                              <button
                                onClick={() => handleApproveSectorPayment(sp._id || sp.id)}
                                className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/20 text-green-600 rounded transition-colors"
                                title={t('common.approve')}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRejectSectorPayment(sp._id || sp.id)}
                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded transition-colors"
                                title={t('common.reject')}
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            </span>
                          )}
                          {user?.role === 'admin' && (sp.approvalStatus === 'APPROVED' || sp.approvalStatus === 'FLAGGED') && (
                            <button
                              onClick={() => handleReopenSectorPayment(sp._id || sp.id)}
                              className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/20 text-purple-600 rounded transition-colors"
                              title={t('common.edit')}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {user?.role === 'admin' && sp.approvalStatus === 'APPROVED' && (
                            <button
                              onClick={() => { setEditPayment(sp); setSectorModalMode('edit'); setShowSectorPaymentModal(true) }}
                              className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600 rounded transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Sector Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {sectorPaymentTotal === 0 ? 'No deposits found' : `Showing ${((sectorPaymentPage - 1) * 15) + 1}–${Math.min(sectorPaymentPage * 15, sectorPaymentTotal)} of ${sectorPaymentTotal} deposits`}
            </p>
            <div className="flex items-center gap-1 font-sans">
              <button disabled={sectorPaymentPage === 1} onClick={() => setSectorPaymentPage(1)} className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-50">«</button>
              <button disabled={sectorPaymentPage === 1} onClick={() => setSectorPaymentPage(p => p - 1)} className="btn btn-secondary px-2 py-1 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: Math.min(5, sectorPaymentPages) }, (_, i) => {
                let start = Math.max(1, sectorPaymentPage - 2)
                const end = Math.min(sectorPaymentPages, start + 4)
                start = Math.max(1, end - 4)
                return start + i
              }).filter(p => p >= 1 && p <= sectorPaymentPages).map(p => (
                <button key={p} onClick={() => setSectorPaymentPage(p)} className={`btn px-3 py-1 text-sm ${p === sectorPaymentPage ? 'btn-primary' : 'btn-secondary'}`}>{p}</button>
              ))}
              <button disabled={sectorPaymentPage >= sectorPaymentPages || sectorPaymentPages === 0} onClick={() => setSectorPaymentPage(p => p + 1)} className="btn btn-secondary px-2 py-1 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
              <button disabled={sectorPaymentPage >= sectorPaymentPages || sectorPaymentPages === 0} onClick={() => setSectorPaymentPage(sectorPaymentPages)} className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-50">»</button>
              <select value={15} onChange={(e) => { setSectorPaymentPage(1) }} className="input ml-2 py-1 text-sm w-24" disabled>
                <option value={15}>15 / page</option>
              </select>
            </div>
          </div>
        </div>
      )}
      </div>
      )}

      {showPaymentModal && (
        <PaymentModal
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(receiptId) => { 
            setShowPaymentModal(false); 
            if (activeTab === 'history') fetchPayments();
            else fetchMonthlyStatus();
            if (receiptId) setSelectedReceiptId(receiptId);
          }}
        />
      )}

      {/* Method-chooser modal for NEW sector deposits */}
      {showDepositMethodModal && (
        <SectorDepositMethodModal
          onClose={() => setShowDepositMethodModal(false)}
          onSuccess={() => {
            setShowDepositMethodModal(false)
            fetchSectorPayments()
          }}
        />
      )}

      {/* Direct edit / correction modal (no method-chooser needed) */}
      {showSectorPaymentModal && (
        <SectorPaymentModal
          onClose={() => { setShowSectorPaymentModal(false); setEditPayment(null) }}
          onSuccess={() => {
            setShowSectorPaymentModal(false)
            setEditPayment(null)
            fetchSectorPayments()
          }}
          editPayment={editPayment}
          mode={sectorModalMode}
        />
      )}

      {showAuditLogsModal && auditLogsPaymentId && (
        <SectorPaymentAuditLogsModal
          paymentId={auditLogsPaymentId}
          onClose={() => { setShowAuditLogsModal(false); setAuditLogsPaymentId(null) }}
        />
      )}

      {selectedReceiptId && (
        <ReceiptModal
          receiptId={selectedReceiptId}
          onClose={() => setSelectedReceiptId(null)}
        />
      )}

      <ConfirmDialog
        open={confirmSaveSelected}
        variant="info"
        title={t('common_ui.record_payments_title')}
        message={t('common_ui.record_payments_message', { count: members.filter(m => checkedIds[m._id] && m.paymentStatus === 'Unpaid').length, month: t(`common.eth_month_${selectedMonthNum}`), year: selectedYearNum })}
        confirmLabel={t('common.save_selected')}
        cancelLabel={t('common.cancel')}
        onConfirm={doSaveSelected}
        onCancel={() => setConfirmSaveSelected(false)}
      />

      <ConfirmDialog
        open={confirmPayAll}
        variant="info"
        title={t('common_ui.pay_all_title')}
        message={t('common_ui.pay_all_message', { count: confirmPayAllCount, month: t(`common.eth_month_${selectedMonthNum}`), year: selectedYearNum })}
        confirmLabel={t('common.pay_all_filtered')}
        cancelLabel={t('common.cancel')}
        onConfirm={doPayAll}
        onCancel={() => setConfirmPayAll(false)}
      />

      <ConfirmDialog
        open={confirmDeletePayment.open}
        variant="danger"
        title={t('common_ui.reverse_payment_title')}
        message={t('common_ui.reverse_payment_message')}
        confirmLabel={t('common.reverse_payment')}
        cancelLabel={t('common.cancel')}
        onConfirm={doDeletePayment}
        onCancel={() => setConfirmDeletePayment({ open: false, id: null })}
      />

      <ConfirmDialog
        open={confirmBulkDeletePayments}
        variant="danger"
        title={t('common_ui.delete_payments_title', { count: selectedPaymentIds.length })}
        message={t('common_ui.delete_payments_message', { count: selectedPaymentIds.length })}
        confirmLabel={t('common.delete_selected')}
        cancelLabel={t('common.cancel')}
        onConfirm={doBulkDeletePayments}
        onCancel={() => setConfirmBulkDeletePayments(false)}
      />

      <DeleteAllConfirmDialog
        open={confirmDeleteAllPayments}
        title={t('common_ui.delete_all_payments_title')}
        message={t('common_ui.delete_all_payments_message')}
        confirmText={t('common_ui.delete_all_payments_confirm')}
        onConfirm={doDeleteAllPayments}
        onCancel={() => setConfirmDeleteAllPayments(false)}
      />
    </motion.div>
  )
}
