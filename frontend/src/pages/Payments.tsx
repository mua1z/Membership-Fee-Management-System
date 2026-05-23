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
  Receipt, Calendar, CheckCircle2, AlertTriangle, Ban, Clock, Building2
} from 'lucide-react'
import { getCurrentEthiopianPeriod, formatEthiopianDate } from '../utils/ethiopianCalendar'

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
  const [activeTab, setActiveTab] = useState<'monthly' | 'history'>('monthly')

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

  // Confirm dialogs
  const [confirmSaveSelected, setConfirmSaveSelected] = useState(false)
  const [confirmPayAll, setConfirmPayAll] = useState(false)
  const [confirmPayAllCount, setConfirmPayAllCount] = useState(0)
  const [pendingPayAllMembers, setPendingPayAllMembers] = useState<MemberPaymentStatus[]>([])
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<{ open: boolean; id: string | number | null }>({ open: false, id: null })

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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'history') {
        fetchPayments()
      } else {
        fetchMonthlyStatus()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [activeTab, historySearch, monthlySearch, selectedMonthNum, selectedYearNum, filters, historyPage, historyLimit, monthlyPage, monthlyLimit, selectedSectorType, selectedSectorId, selectedCategoryId, hasFiltered])

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
        'Payment Date':  m.paymentDate ? new Date(m.paymentDate).toLocaleDateString() : '-'
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
        'Payment Date':  p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '-',
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
      alert("Please check the 'Paid' box before saving.")
      return
    }
    
    setSavingId(member._id)
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
        receivedBy: 'System Admin', 
        status: 'Paid'
      })
      await fetchMonthlyStatus()
      if (res.data.data?.receiptId) {
        setSelectedReceiptId(res.data.data.receiptId)
      }
    } catch(err: any) {
      console.error(err)
      alert(err.response?.data?.message || 'Error recording payment')
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
    try {
      const payload = selectedMembers.map(member => ({
        member: member.memberId,
        amount: member.fee,
        method: 'Cash',
        paymentDate: new Date().toISOString(),
        periodMonth: Number(selectedMonthNum),
        periodYear: Number(selectedYearNum),
        receivedBy: 'Bulk Collection',
        status: 'Paid'
      }))
      await api.post('/payments/bulk', payload)
      await fetchMonthlyStatus()
    } catch (err: any) {
      console.error(err)
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
    try {
      const payload = pendingPayAllMembers.map(member => ({
        member: member.memberId,
        amount: member.fee,
        method: 'Cash',
        paymentDate: new Date().toISOString(),
        periodMonth: Number(selectedMonthNum),
        periodYear: Number(selectedYearNum),
        receivedBy: 'Bulk Collection',
        status: 'Paid'
      }))
      await api.post('/payments/bulk', payload)
      await fetchMonthlyStatus()
    } catch (err: any) {
      console.error(err)
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
    if (status === 'Unpaid') return <span className="badge badge-error">Unpaid</span>
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
          <p className="text-gray-600 dark:text-gray-400">Track and record member payments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={activeTab === 'monthly' ? handleExportMonthly : handleExportHistory}
            disabled={exporting}
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
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'monthly'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('common.monthly_collection')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('common.payment_history')}
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
            <button onClick={() => navigate(-1)} className="btn btn-secondary flex items-center gap-2" title="Go back">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.back')}</span>
            </button>
          )}

          <button onClick={() => setShowFilters(!showFilters)} className={`btn btn-secondary flex items-center gap-2 ${showFilters ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Toggle filters">
            <Filter className="w-4 h-4" />
            {t('common.filter')}
          </button>
          
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
          <label className="font-medium whitespace-nowrap text-xs text-gray-500 uppercase tracking-wider hidden md:block">{t('common.billing_period')}:</label>
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1">
            <select value={selectedMonthNum} onChange={(e) => setSelectedMonthNum(Number(e.target.value))} className="bg-transparent border-none text-sm font-semibold focus:ring-0 cursor-pointer">
              {Array.from({ length: 13 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{t(`common.eth_month_${m}`)}</option>
              ))}
            </select>
            <select value={selectedYearNum} onChange={(e) => setSelectedYearNum(Number(e.target.value))} className="bg-transparent border-none text-sm font-semibold focus:ring-0 cursor-pointer">
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
              <option value="">All Types</option>
              <option value="Salary-Based">Salary-Based</option>
              <option value="Non-Salary">Non-Salary</option>
              <option value="Business">Business</option>
              <option value="Investor">Investor</option>
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('common.filter')}...</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Please choose your desired filters above and click '{t('common.display_payments')}' to fetch the records from the database.
          </p>
        </div>
      ) : (
      <>
      {/* Metrics Summary */}
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

      {activeTab === 'monthly' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          
          <div className="flex justify-end mb-2">
              {user?.role !== 'expert' && (
                <button 
                  onClick={handleSaveSelected}
                  className="btn btn-primary flex items-center gap-2 animate-in slide-in-from-right-2 ml-auto"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('common.save_selected')} ({members.filter(m => checkedIds[m._id] && m.paymentStatus === 'Unpaid').length})</span>
                  <span className="sm:hidden">{t('common.save')} ({members.filter(m => checkedIds[m._id] && m.paymentStatus === 'Unpaid').length})</span>
                </button>
              )}
              
              {user?.role !== 'expert' && members.some(m => m.paymentStatus === 'Unpaid') && (
                <button 
                  onClick={handlePayAllFiltered}
                  className="btn btn-warning flex items-center gap-2 animate-in slide-in-from-right-2 ml-2"
                  title="Record payment for ALL unpaid members matching current filters"
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('common.pay_all_filtered')}</span>
                </button>
              )}
            </div>

          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th>{t('common.members')}</th>
                  <th>{t('common.monthly_fee')}</th>
                  <th>{t('common.status')}</th>
                  <th className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">{t('common.paid')}</span>
                      <input 
                        type="checkbox" 
                        title="Select/Deselect all unpaid"
                        className="w-4 h-4 cursor-pointer"
                        checked={members.length > 0 && members.filter(m => m.paymentStatus === 'Unpaid').every(m => checkedIds[m._id])}
                        onChange={handleToggleAll}
                        disabled={loading || !members.some(m => m.paymentStatus === 'Unpaid') || user?.role === 'expert'}
                      />
                    </div>
                  </th>
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
                        <p className="text-[10px] font-bold uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#D4AF37]">{t('common.processing_payments')}</p>
                      </div>
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-500">{t('common.no_members_found')}</td></tr>
                ) : (
                  members.map((member) => (
                    <tr key={member._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td>
                        <p className="font-medium">{member.fullName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{member.memberId} • {member.branch}</p>
                      </td>
                      <td className="font-semibold">{Number(member.fee).toLocaleString()}</td>
                      <td>{getStatusBadge(member.paymentStatus)}</td>
                      <td className="text-center">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 cursor-pointer accent-primary inline-block align-middle"
                          checked={checkedIds[member._id] || false}
                          onChange={() => toggleCheck(member._id)}
                          disabled={member.paymentStatus === 'Paid'}
                        />
                      </td>
                      <td className="text-right">
                        {member.paymentStatus === 'Paid' ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="btn btn-sm bg-green-100 text-green-700 cursor-default px-2">
                              <Check className="w-4 h-4 mr-1 inline-block" /> {t('common.recorded')}
                            </span>
                            {user?.role !== 'expert' && member.paymentId && (
                              <button
                                onClick={() => handleDeletePayment(member.paymentId || '')}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded"
                                title={t('common.reverse_payment')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ) : user?.role !== 'expert' ? (
                          <button 
                            onClick={() => handleSavePayment(member)}
                            disabled={savingId === member._id || !checkedIds[member._id]}
                            className="btn btn-primary btn-sm flex items-center justify-center ml-auto min-w-[80px]"
                          >
                            {savingId === member._id ? t('common.loading') : <><Save className="w-4 h-4 mr-1" /> {t('common.save')}</>}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">{t('common.action')} disabled</span>
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
              {monthlyTotal === 0 ? 'No members found' : `Showing ${((monthlyPage - 1) * monthlyLimit) + 1}–${Math.min(monthlyPage * monthlyLimit, monthlyTotal)} of ${monthlyTotal} members`}
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
                {[15, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th>Receipt ID</th>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Period</th>
                  <th>Received By</th>
                  <th>Schedule ({selectedYearNum})</th>
                  <th>Status</th>
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
                ) : payments.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-gray-500">No payments found</td></tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="font-mono text-xs">{payment.receiptId}</td>
                      <td>
                        <div>
                          <p className="font-medium">{payment.member?.fullName || payment.memberId}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{payment.member?.branch}</p>
                        </div>
                      </td>
                      <td className="font-semibold">{payment.amount.toLocaleString()}</td>
                      <td>{payment.currency}</td>
                      <td>{getMethodBadge(payment.method)}</td>
                      <td>{payment.paymentDate ? formatEthiopianDate(payment.paymentDate) : '-'}</td>
                      <td>{t(`common.eth_month_${payment.period.month}`)} / {payment.period.year}</td>
                      <td>{payment.receivedBy}</td>
                      <td>
                        {/* GitHub-style 12-month schedule: highlight the paid period month */}
                        <div className="flex gap-[2px] items-center">
                          {Array.from({ length: 13 }, (_, idx) => {
                            const m = idx + 1
                            const isPaid = payment.period?.month === m && payment.period?.year === selectedYearNum
                            return (
                              <div
                                key={m}
                                title={`${t(`common.eth_month_${m}`)} ${selectedYearNum}: ${isPaid ? 'Paid' : 'No payment'}`}
                                className={`w-4 h-4 rounded-sm flex items-center justify-center text-[7px] font-bold transition-all cursor-help
                                  ${ isPaid
                                    ? 'bg-green-500 text-white shadow-sm shadow-green-300'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                                  }`}
                              >
                                {m}
                              </div>
                            )
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(payment.status)}
                          <button 
                            onClick={() => setSelectedReceiptId(payment.receiptId)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-primary transition-colors"
                            title="View Receipt"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {user?.role !== 'expert' && (
                            <button
                              onClick={() => handleDeletePayment(payment.id || payment._id || '')}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded transition-colors"
                              title="Delete Payment"
                            >
                              <Trash2 className="w-4 h-4" />
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
          {/* History Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {historyTotal === 0 ? 'No payments found' : `Showing ${((historyPage - 1) * historyLimit) + 1}–${Math.min(historyPage * historyLimit, historyTotal)} of ${historyTotal} payments`}
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
                {[15, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
      </>
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

      {selectedReceiptId && (
        <ReceiptModal
          receiptId={selectedReceiptId}
          onClose={() => setSelectedReceiptId(null)}
        />
      )}

      <ConfirmDialog
        open={confirmSaveSelected}
        variant="info"
        title="Record Selected Payments"
        message={`This will record payments for ${members.filter(m => checkedIds[m._id] && m.paymentStatus === 'Unpaid').length} selected members for ${t(`common.eth_month_${selectedMonthNum}`)} ${selectedYearNum}.`}
        confirmLabel="Record Payments"
        cancelLabel="Cancel"
        onConfirm={doSaveSelected}
        onCancel={() => setConfirmSaveSelected(false)}
      />

      <ConfirmDialog
        open={confirmPayAll}
        variant="info"
        title="Pay All Unpaid Members"
        message={`This will record payments for all ${confirmPayAllCount} unpaid members matching the current filters for ${t(`common.eth_month_${selectedMonthNum}`)} ${selectedYearNum}.`}
        confirmLabel="Record All Payments"
        cancelLabel="Cancel"
        onConfirm={doPayAll}
        onCancel={() => setConfirmPayAll(false)}
      />

      <ConfirmDialog
        open={confirmDeletePayment.open}
        variant="danger"
        title="Reverse Payment"
        message="This will permanently delete this payment record. This action cannot be undone."
        confirmLabel="Reverse Payment"
        cancelLabel="Cancel"
        onConfirm={doDeletePayment}
        onCancel={() => setConfirmDeletePayment({ open: false, id: null })}
      />
    </motion.div>
  )
}
