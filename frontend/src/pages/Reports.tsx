import { useState, useEffect, useMemo } from 'react'
import api from '../lib/api'
import { useTranslation } from 'react-i18next'
import { Download, Filter, Wallet, Banknote, Users, Search, Printer, UserCheck, UserMinus } from 'lucide-react'
import { motion } from 'framer-motion'
import PageLoader from '../components/PageLoader'
import { useAuth } from '../context/AuthContext'
import { getCurrentEthiopianPeriod, ETHIOPIAN_MONTHS_EN_LIST } from '../utils/ethiopianCalendar'

const ITEMS_PER_PAGE = 10

export default function Reports() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [periodType, setPeriodType] = useState('monthly')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentEthiopianPeriod().month)
  const [selectedYear, setSelectedYear] = useState(getCurrentEthiopianPeriod().year)
  const [sectorTypes, setSectorTypes] = useState<any[]>([])
  const [selectedSectorType, setSelectedSectorType] = useState('')
  const [sectors, setSectors] = useState<any[]>([])
  const [selectedSectorId, setSelectedSectorId] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  const [sectorReportData, setSectorReportData] = useState<any>(null)
  const [sectorReportLoading, setSectorReportLoading] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    api.get('/sector-types').then(res => setSectorTypes(res.data))
  }, [])

  useEffect(() => {
    if (selectedSectorType) {
      api.get(`/sectors?type=${selectedSectorType}`).then(res => setSectors(res.data))
    } else {
      setSectors([])
    }
  }, [selectedSectorType])

  useEffect(() => {
    if (selectedSectorId) {
      api.get(`/sectors/${selectedSectorId}/categories`).then(res => setCategories(res.data)).catch(() => {})
    } else {
      setCategories([])
    }
  }, [selectedSectorId])

  useEffect(() => {
    fetchSectorReport()
  }, [periodType, selectedMonth, selectedYear, selectedSectorType, selectedSectorId, selectedCategoryId, paymentStatus])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const fetchSectorReport = async () => {
    setSectorReportLoading(true)
    try {
      const params: Record<string, any> = { month: selectedMonth, year: selectedYear, periodType }
      if (selectedSectorType) params.sectorType = selectedSectorType
      if (selectedSectorId) params.sectorId = selectedSectorId
      if (selectedCategoryId) params.memberCategoryId = selectedCategoryId
      if (paymentStatus) params.paymentStatus = paymentStatus
      const res = await api.get('/reports/sectors', { params })
      setSectorReportData(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setSectorReportLoading(false)
    }
  }

  const handleSectorExport = async () => {
    if (!sectorReportData?.sectors) return
    const XLSX = await import('xlsx')

    const rows = sectorReportData.sectors.map((s: any) => ({
      'SECTOR NAME': s.sectorName,
      'TOTAL MEMBERS': s.totalMembers,
      'PAID MEMBERS': s.paidMembers,
      'UNPAID MEMBERS': s.unpaidMembers,
      'TOTAL REVENUE': s.totalRevenue,
      'PAYMENT %': `${s.paymentPercentage}%`
    }))

    rows.push({
      'SECTOR NAME': 'TOTAL',
      'TOTAL MEMBERS': sectorReportData.summary.totalMembers,
      'PAID MEMBERS': sectorReportData.summary.totalPaidMembers,
      'UNPAID MEMBERS': sectorReportData.summary.totalUnpaidMembers,
      'TOTAL REVENUE': sectorReportData.summary.totalRevenue,
      'PAYMENT %': `${sectorReportData.summary.overallCollectionRate}%`
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sector Report')

    const now = new Date()
    XLSX.writeFile(wb, `PP-Sector-Report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.xlsx`)
  }

  const handlePrint = () => {
    window.print()
  }

  const filteredSectors = useMemo(() => {
    if (!sectorReportData?.sectors) return []
    let result = sectorReportData.sectors
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((s: any) => s.sectorName.toLowerCase().includes(q))
    }
    return result
  }, [sectorReportData, searchQuery])

  const totalPages = Math.ceil(filteredSectors.length / ITEMS_PER_PAGE)
  const paginatedSectors = filteredSectors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('report.title')}</h1>
          <p className="text-slate-500">{t('report.financial_audit')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSectorExport} className="bg-[#dfab3b] hover:bg-[#c99a35] text-white px-4 py-2 rounded font-bold flex items-center gap-2 text-sm shadow-sm transition-colors">
            <Download className="w-4 h-4" />
            {t('report.export_excel')}
          </button>
          <button onClick={handlePrint} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded font-bold flex items-center gap-2 text-sm transition-colors">
            <Printer className="w-4 h-4" />
            {t('buttons.print')}
          </button>
        </div>
      </div>

      {sectorReportData && !sectorReportLoading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: t('report.total_paid'), value: sectorReportData.summary.totalMembers.toLocaleString(), icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
            { label: t('report.total_paid'), value: sectorReportData.summary.totalPaidMembers.toLocaleString(), icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
            { label: t('report.total_unpaid'), value: sectorReportData.summary.totalUnpaidMembers.toLocaleString(), icon: UserMinus, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
            { label: t('report.collected_revenue'), value: `ETB ${sectorReportData.summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Wallet, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
            { label: t('report.collection_rate'), value: `${sectorReportData.summary.overallCollectionRate}%`, icon: Banknote, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' }
          ].map((s, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg xl:text-xl font-bold text-slate-900 dark:text-white break-words">{s.value}</p>
                <p className="text-xs font-bold text-slate-500 mt-0.5 break-words">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 print:hidden space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common.search')}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">
            <Filter className="w-4 h-4" />
            {t('common.filter')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={selectedSectorType}
            onChange={(e) => { setSelectedSectorType(e.target.value); setSelectedSectorId(''); setSelectedCategoryId(''); }}
            className="w-full px-3 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={user?.role === 'sector_officer'}
          >
            <option value="">{t('report.all_types')}</option>
            {sectorTypes.map(t_obj => (
              <option key={t_obj.id} value={t_obj.name}>{t_obj.name === 'Institution' ? t('common.institution') : t_obj.name === 'Rural Cluster' ? t('common.rural') : t_obj.name === 'Urban Woreda' ? t('common.urban') : t_obj.name === 'Secondary School' ? t('common.secondary_school') : t_obj.name === 'Health Institution' ? t('common.health_institution') : t_obj.name}</option>
            ))}
          </select>

          <select
            value={selectedSectorId}
            onChange={(e) => { setSelectedSectorId(e.target.value); setSelectedCategoryId(''); }}
            className="w-full px-3 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={!selectedSectorType && user?.role !== 'sector_officer'}
          >
            <option value="">{t('report.all_units')}</option>
            {sectors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-3 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{t('report.all_categories')}</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value)}
            className="w-full px-3 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="monthly">{t('payment.monthly')}</option>
            <option value="quarterly">{t('payment.quarterly')}</option>
            <option value="yearly">{t('payment.annual')}</option>
          </select>

          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="w-full px-3 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{t('payment.all_statuses')}</option>
            <option value="paid">{t('common.paid')}</option>
            <option value="unpaid">{t('common.unpaid')}</option>
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full px-3 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {ETHIOPIAN_MONTHS_EN_LIST.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full px-3 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {Array.from({ length: 11 }, (_, i) => getCurrentEthiopianPeriod().year + 5 - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {sectorReportLoading ? (
        <PageLoader />
      ) : sectorReportData ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden print:overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">{t('sector.name')}</th>
                  <th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">{t('common.total_members')}</th>
                  <th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">{t('report.total_paid')}</th>
                  <th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">{t('report.total_unpaid')}</th>
                  <th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">{t('report.collected_revenue')}</th>
                  <th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">{t('report.collection_rate')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSectors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">{t('common.no_data')}</td>
                  </tr>
                ) : (
                  paginatedSectors.map((sector: any) => (
                    <tr key={sector.sectorId} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-4 px-5 text-sm font-bold text-slate-700 dark:text-slate-200">{sector.sectorName}</td>
                      <td className="py-4 px-5 text-sm text-slate-600 dark:text-slate-400">{sector.totalMembers}</td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs font-bold min-w-[2.5rem]">
                          {sector.paidMembers}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 text-xs font-bold min-w-[2.5rem]">
                          {sector.unpaidMembers}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-sm font-bold text-slate-700 dark:text-slate-300">
                        ETB {sector.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shrink-0">
                            <div
                              className={`h-full rounded-full transition-all ${
                                sector.paymentPercentage >= 80 ? 'bg-emerald-500'
                                : sector.paymentPercentage >= 50 ? 'bg-[#dfab3b]'
                                : 'bg-rose-500'
                              }`}
                              style={{ width: `${sector.paymentPercentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8">{sector.paymentPercentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700 print:hidden">
              <p className="text-[11px] text-slate-500 font-bold">
                {t('table.showing', { start: Math.min(filteredSectors.length, 1 + (currentPage - 1) * ITEMS_PER_PAGE), end: Math.min(currentPage * ITEMS_PER_PAGE, filteredSectors.length), total: filteredSectors.length })}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 flex items-center justify-center rounded text-[11px] font-bold transition-all ${
                      currentPage === page
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 text-center py-12">
          <p className="text-slate-500">{t('report.no_data')}</p>
        </div>
      )}
    </motion.div>
  )
}
