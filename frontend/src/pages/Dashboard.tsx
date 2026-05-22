import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import PageLoader from '../components/PageLoader'
import OrganizationTree from '../components/OrganizationTree'
import { Users, DollarSign, TrendingUp, AlertTriangle, Building2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts'

interface DashboardData {
  summary: {
    totalMembers: number
    activeMembers: number
    yearlyRevenue: number
    monthlyRevenue: number
    pendingPayments: number
    defaultedMembers: number
  }
  membersByType: Array<{ _id: string; count: number }>
  membersByBranch: Array<{ _id: string; count: number }>
  membersByCluster: Array<{ _id: string; count: number }>
  membersBySector: Array<{ _id: string; count: number }>
  membersByCategory: Array<{ _id: string; count: number }>
  paymentTrend: Array<{ _id: { year: number; month: number }; revenue: number; count: number }>
  topContributors: Array<{ fullName: string; memberId: string; branch: string; contribution: { monthlyFee: number } }>
  revenueByType: Array<{ _id: string; totalRevenue: number }>
  scopedToSector: boolean
}

const COLORS = ['#C6930B', '#0F172A', '#1E293B', '#475569', '#EAB308', '#926C08', '#FDE047', '#D1D5DB']

export default function Dashboard() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language || 'am'
  
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const isSectorOfficer = user?.role === 'sector_officer'

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => setData(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <PageLoader message={t('common.analytics_loading')} />
  }

  if (!data) {
    return <div className="text-center text-rose-500 py-20 font-bold">{t('common.dashboard_fail')}</div>
  }

  const statCards = [
    {
      title: isSectorOfficer ? t('common.sector_members') : t('common.total_members'),
      value: data.summary.totalMembers,
      icon: Users,
      color: 'text-slate-900 dark:text-white',
      bgColor: 'bg-white dark:bg-slate-900',
      borderColor: 'border-slate-200 dark:border-slate-800',
      subtext: `${data.summary.activeMembers} ${t('common.active')} ${t('common.members')}`
    },
    {
      title: isSectorOfficer ? t('common.sector_members') : t('common.yearly_revenue'),
      value: `ETB ${Number(data.summary.yearlyRevenue).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-[var(--gold)]',
      bgColor: 'bg-white dark:bg-slate-900',
      borderColor: 'border-[var(--gold)]/30',
      subtext: `ETB ${Number(data.summary.monthlyRevenue).toLocaleString()} ${t('common.just_now')}`
    },
    {
      title: t('common.payment_status'),
      value: data.summary.pendingPayments,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bgColor: 'bg-white dark:bg-slate-900',
      borderColor: 'border-rose-100 dark:border-rose-900/30',
      subtext: `${data.summary.defaultedMembers} ${t('common.inactive')}`
    },
    {
      title: t('common.performance'),
      value: '+12.5%',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-white dark:bg-slate-900',
      borderColor: 'border-emerald-100 dark:border-emerald-900/30',
      subtext: t('common.growth_vs_last_year'),
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30, rotateX: 20, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0, 
      rotateX: 0, 
      scale: 1, 
      transition: { type: "spring", bounce: 0.4 } as any
    }
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
      style={{ perspective: 1000 }}
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
            {t('common.prosperity_party')}         <span className="text-[var(--gold)]">{t('common.app_title')}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium ml-2 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {currentLang === 'am' ? 'የድሬዳዋ አስተዳደር መንግስት ተቋማት' : 'Dire Dawa Administration Institutions'}
            </span>
          </h1>
          {user?.role === 'admin' && (
            <p className="text-[11px] text-slate-500 font-medium">
              {currentLang === 'am'
                ? 'የድሬዳዋ አስተዳደር መንግስት ተቋማት የአባልነት መዋጮ አስተዳደር ስርዓት'
                : 'Dire Dawa Administration Institutions membership contribution management system'
              }
            </p>
          )}
          {user?.role === 'sector_officer' && (
            <p className="text-[11px] text-slate-500 font-medium">
              {currentLang === 'am' ? 'ዘርፍ' : 'Sector'}: <span className="text-[var(--gold)] font-bold">{user?.assignedSectorUnit?.name || 'Assigned Sector'}</span>
            </p>
          )}
        </div>

      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <motion.div 
            key={idx} 
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", bounce: 0.6 }}
            className={`card border-b-2 ${card.borderColor} flex flex-col gap-2 group shadow-[0_10px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all relative overflow-hidden`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:bg-[var(--navy)] transition-colors`}>
                <card.icon className={`w-4 h-4 ${card.color} group-hover:text-white`} />
              </div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t('common.live')}</span>
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{card.value}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{card.title}</p>
            </div>
            <p className="text-[9px] font-medium text-slate-400 border-t border-slate-50 dark:border-slate-800 pt-1.5 mt-1 relative z-10">
              {card.subtext}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row 1 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Trend */}
        <motion.div whileHover={{ scale: 1.01 }} className="card">
          <h3 className="text-lg font-semibold mb-4">{t('common.revenue_trend')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.paymentTrend.slice(-12)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="_id.month" 
                tickFormatter={(m) => t(`common.eth_month_${m}`)} 
              />
              <YAxis />
              <Tooltip formatter={(value: number) => `ETB ${value.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Member Category Breakdown */}
        <motion.div whileHover={{ scale: 1.01 }} className="card">
          <h3 className="text-lg font-semibold mb-4">
            {isSectorOfficer ? t('common.members_by_category') : t('common.members_by_type')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={isSectorOfficer
                  ? (data.membersByCategory?.length ? data.membersByCategory : data.membersByType)
                  : data.membersByType}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ _id, percent }: any) => `${t(_id)} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {(isSectorOfficer
                  ? (data.membersByCategory?.length ? data.membersByCategory : data.membersByType)
                  : data.membersByType
                ).map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name, props) => [value, t(props.payload._id)]} />
              <Legend formatter={(value) => t(value)} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      {/* Charts Row 2 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {!isSectorOfficer && (
          <motion.div whileHover={{ scale: 1.01 }} className="card">
            <h3 className="text-lg font-semibold mb-4">{t('common.members_by_unit')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.membersByBranch}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} tickFormatter={(v) => t(v)} />
                <YAxis />
                <Tooltip formatter={(value, name, props) => [value, t(props.payload._id)]} />
                <Bar dataKey="count" fill="#0ea5e9" name={t('common.members')} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {!isSectorOfficer ? (
          <motion.div whileHover={{ scale: 1.01 }} className="card">
            <h3 className="text-lg font-semibold mb-4">{t('common.members_by_type')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.membersByCluster.map((d: any) => ({
                    ...d,
                    _id: d._id === 'Institution' ? t('common.institution')
                       : d._id === 'Rural Cluster' ? t('common.rural')
                       : d._id === 'Urban Woreda' ? t('common.urban')
                       : d._id === 'Secondary School' ? t('common.secondary_school')
                       : d._id === 'Health Institution' ? t('common.health_institution')
                       : d._id || 'N/A'
                  }))}
                  cx="50%" cy="50%"
                  labelLine={false}
                  label={({ _id, percent }: any) => `${t(_id)} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.membersByCluster.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#0ea5e9' : index === 1 ? '#22c55e' : '#f59e0b'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [value, t(props.payload._id)]} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        ) : (
          <motion.div whileHover={{ scale: 1.01 }} className="card">
            <h3 className="text-lg font-semibold mb-4">{t('common.members_by_category')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.membersByCategory?.length ? data.membersByCategory : data.membersByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} tickFormatter={(v) => t(v)} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value, name, props) => [value, t(props.payload._id)]} />
                <Bar dataKey="count" name={t('common.members')} radius={[4, 4, 0, 0]}>
                  {(data.membersByCategory?.length ? data.membersByCategory : data.membersByType).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </motion.div>

      {/* Top Contributors & Sector Performance */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Contributors */}
        <motion.div whileHover={{ scale: 1.01 }} className="card">
          <h3 className="text-lg font-semibold mb-4">{t('common.top_contributors')}</h3>
          <div className="space-y-3">
            {data.topContributors.length === 0 ? (
              <p className="text-center text-gray-400 py-6">{t('common.no_contributors')}</p>
            ) : (
              data.topContributors.map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{member.fullName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{member.memberId} · {member.branch}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600 text-sm">ETB {member.contribution.monthlyFee.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Revenue by Type - Hide for sector officers */}
        {!isSectorOfficer && (
          <motion.div whileHover={{ scale: 1.01 }} className="card">
            <h3 className="text-lg font-semibold mb-4">{t('common.revenue_by_type')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenueByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(value: number) => `ETB ${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="totalRevenue" fill="#22c55e" name="Revenue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </motion.div>

      {/* Admin/Expert only: Sector Performance table */}
      {!isSectorOfficer && data.membersBySector?.length > 0 && (
        <motion.div variants={itemVariants} whileHover={{ scale: 1.01 }} className="card">
          <h3 className="text-lg font-semibold mb-4">{t('common.members_by_sector')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.membersBySector.slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" name={t('common.members')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Organization Hierarchy Tree */}
      {!isSectorOfficer && (
        <motion.div variants={itemVariants}>
          <OrganizationTree />
        </motion.div>
      )}
    </motion.div>
  )
}

