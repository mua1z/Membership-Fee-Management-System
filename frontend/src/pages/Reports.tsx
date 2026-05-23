import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useTranslation } from 'react-i18next'
import { Download, FileSpreadsheet, FileText, Filter, Wallet, Banknote, Calculator, Building2, AlertTriangle, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import PageLoader from '../components/PageLoader'
import { useAuth } from '../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { getCurrentEthiopianPeriod, ETHIOPIAN_MONTHS_EN_LIST } from '../utils/ethiopianCalendar'

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function Reports() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [monthlyData, setMonthlyData] = useState<any>(null)
  const [yearlyData, setYearlyData] = useState<any>(null)
  const [hqBranch, setHqBranch] = useState<any>(null)
  const [defaulters, setDefaulters] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState('monthly')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentEthiopianPeriod().month)
  const [selectedYear, setSelectedYear] = useState(getCurrentEthiopianPeriod().year)
  const [sectorTypes, setSectorTypes] = useState<any[]>([])
  const [selectedSectorType, setSelectedSectorType] = useState('')
  const [sectors, setSectors] = useState<any[]>([])
  const [selectedSectorId, setSelectedSectorId] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

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
    fetchReports()
  }, [reportType, selectedMonth, selectedYear, selectedSectorType, selectedSectorId, selectedCategoryId])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const filterParams: Record<string, any> = {}
      if (selectedSectorType) filterParams.sectorType = selectedSectorType
      if (selectedSectorId) filterParams.sectorId = selectedSectorId
      if (selectedCategoryId) filterParams.memberCategoryId = selectedCategoryId
      if (reportType === 'monthly') {
        const res = await api.get('/reports/monthly-revenue', {
          params: { month: selectedMonth, year: selectedYear, ...filterParams }
        })
        setMonthlyData(res.data.data)
      } else if (reportType === 'yearly') {
        const res = await api.get('/reports/yearly-revenue', {
          params: { year: selectedYear, ...filterParams }
        })
        setYearlyData(res.data.data)
      } else if (reportType === 'hq-branch') {
        const res = await api.get('/reports/hq-branch', {
          params: { year: selectedYear, ...filterParams }
        })
        setHqBranch(res.data.data)
      } else if (reportType === 'defaulters') {
        const res = await api.get('/reports/defaulters', { params: filterParams })
        setDefaulters(res.data.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const res = await api.get('/reports/export')
      const data = res.data.data
      
      const XLSX = await import('xlsx')
      
      // Members sheet
      const membersWs = XLSX.utils.json_to_sheet(data.members)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, membersWs, 'Members')
      
      // Payments sheet
      const paymentsWs = XLSX.utils.json_to_sheet(data.payments)
      XLSX.utils.book_append_sheet(wb, paymentsWs, 'Payments')
      
      // Receipts sheet
      const receiptsWs = XLSX.utils.json_to_sheet(data.receipts)
      XLSX.utils.book_append_sheet(wb, receiptsWs, 'Receipts')
      
      const now = new Date()
      XLSX.writeFile(wb, `PP-Dire-Dawa-Branch-Full-Report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.xlsx`)
    } catch (err) {
      console.error(err)
    }
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
          <h1 className="text-2xl font-bold">{t('common.reports')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('common.financial_audit_reports')}</p>
        </div>
        <button onClick={handleExport} className="btn btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          {t('common.export_excel')}
        </button>
      </div>

      {/* Report Type Selector */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="font-medium">{t('common.report_type')}:</span>
          </div>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="input"
          >
            <option value="monthly">{t('common.monthly_revenue')}</option>
            <option value="yearly">{t('common.yearly_revenue')}</option>
            <option value="hq-branch">{t('common.hq_vs_branch')}</option>
            <option value="defaulters">{t('common.defaulter_report')}</option>
          </select>


          {user?.role !== 'sector_officer' && (
            <select
              value={selectedSectorType}
              onChange={(e) => { setSelectedSectorType(e.target.value); setSelectedSectorId(''); setSelectedCategoryId(''); }}
              className="input"
            >
              <option value="">{t('common.all_sector_types')}</option>
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

          <select
            value={selectedSectorId}
            onChange={(e) => { setSelectedSectorId(e.target.value); setSelectedCategoryId(''); }}
            className="input"
            disabled={!selectedSectorType && user?.role !== 'sector_officer'}
          >
            <option value="">{t('common.all_units')}</option>
            {sectors.map(s => (
              <option key={s.id} value={s.id}>{t(`common.${s.name}`, { defaultValue: s.name })}</option>
            ))}
          </select>

          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="input"
            disabled={!selectedSectorId}
          >
            <option value="">{t('common.all_categories')}</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{t(`common.${c.name}`, { defaultValue: c.name })}</option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="input"
            style={{ display: reportType === 'monthly' ? 'block' : 'none' }}
          >
            {ETHIOPIAN_MONTHS_EN_LIST.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {t(`common.eth_month_${idx + 1}`, { defaultValue: name })}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="input"
          >
            {Array.from({ length: 11 }, (_, i) => getCurrentEthiopianPeriod().year + 5 - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Content */}
      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Monthly Revenue Report */}
          {reportType === 'monthly' && monthlyData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: t('common.total_revenue'), value: `ETB ${monthlyData.summary.totalRevenue?.toLocaleString() || 0}`, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                  { label: t('common.total_payments'), value: monthlyData.summary.totalPayments || 0, icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: t('common.avg_payment'), value: `ETB ${Math.round(monthlyData.summary.avgPayment || 0).toLocaleString()}`, icon: Calculator, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' }
                ].map((s, idx) => (
                  <div key={idx} className="card flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">{t('common.revenue_by_type')}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData.byType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="_id" tickFormatter={(v) => t(v)} />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `ETB ${value.toLocaleString()}`} />
                      <Legend formatter={(v) => t(v)} />
                      <Bar dataKey="totalRevenue" fill="#0ea5e9" name={t('common.total_revenue')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">{t('common.revenue_by_category')}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData.byCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={(v) => t(v)} />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `ETB ${value.toLocaleString()}`} />
                      <Legend formatter={(v) => t(v)} />
                      <Bar dataKey="totalRevenue" fill="#22c55e" name={t('common.total_revenue')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Yearly Revenue Report */}
          {reportType === 'yearly' && yearlyData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: t('common.yearly_revenue'), value: `ETB ${yearlyData.totalRevenue?.toLocaleString() || 0}`, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                  { label: t('common.total_payments'), value: yearlyData.totalPayments || 0, icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' }
                ].map((s, idx) => (
                  <div key={idx} className="card flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4">{t('common.monthly_breakdown')}</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={yearlyData.monthlyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" tickFormatter={(m) => t(`common.eth_month_${m}`)} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `ETB ${value.toLocaleString()}`} />
                    <Legend formatter={(v) => t(v)} />
                    <Bar dataKey="monthlyRevenue" fill="#0ea5e9" name={t('common.total_revenue')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}


          {/* HQ vs Sector Unit Distribution */}
          {reportType === 'hq-branch' && hqBranch && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: `${t('common.hq_share')} (${hqBranch.hqShare.percentage}%)`, value: `ETB ${hqBranch.hqShare.amount?.toLocaleString() || 0}`, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: `${t('common.branch_share')} (${hqBranch.branchShare.percentage}%)`, value: `ETB ${hqBranch.branchShare.amount?.toLocaleString() || 0}`, icon: Users, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' }
                ].map((s, idx) => (
                  <div key={idx} className="card flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4">{t('common.distribution_chart')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: `${t('common.hq_share')} (20%)`, value: hqBranch.hqShare.amount },
                        { name: `${t('common.branch_share')} (80%)`, value: hqBranch.branchShare.amount }
                      ]}
                      cx="50%"
                      cy="50%"
                      label
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#0ea5e9" />
                      <Cell fill="#22c55e" />
                    </Pie>
                    <Tooltip formatter={(value: number) => `ETB ${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Defaulter Report */}
          {reportType === 'defaulters' && defaulters && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: t('common.total_defaulters'), value: defaulters.totalDefaulters || 0, icon: Users, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
                  { label: t('common.total_outstanding'), value: `ETB ${defaulters.totalOutstanding?.toLocaleString() || 0}`, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' }
                ].map((s, idx) => (
                  <div key={idx} className="card flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="table-container">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th>{t('common.member_id')}</th>
                      <th>{t('common.full_name')}</th>
                      <th>{t('common.sector_unit')}</th>
                      <th>{t('common.membership_type')}</th>
                      <th>{t('common.monthly_fee')}</th>
                      <th>{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {defaulters.defaulters?.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-500">{t('common.no_defaulters_found')} ✅</td></tr>
                    ) : (
                      defaulters.defaulters?.map((member: any) => (
                        <tr key={member._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td>{member.memberId}</td>
                          <td>{member.fullName}</td>
                          <td>{member.branch}</td>
                          <td>{t(member.membershipType)}</td>
                          <td className="font-semibold">ETB {(member.contributionMonthlyFee || member.contribution?.monthlyFee || 0).toLocaleString()}</td>
                          <td><span className="badge badge-danger">{t(member.paymentStatus)}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
