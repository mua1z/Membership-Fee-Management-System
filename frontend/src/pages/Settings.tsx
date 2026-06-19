import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useTranslation } from 'react-i18next'
import { Settings, DollarSign, RotateCcw, Trash2, Save } from 'lucide-react'
import { motion } from 'framer-motion'
import PageLoader from '../components/PageLoader'
import ConfirmDialog from '../components/ConfirmDialog'

export default function SettingsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('contribution')
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings')
      setSettings(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      // Filter out branches without names before saving
      const dataToSave = {
        ...settings,
        branches: settings.branches.filter((b: any) => b.name && b.name.trim() !== '')
      }
      await api.put('/settings', dataToSave)
      setMessage('⏳ Settings saved. Recalculating all members...')

      // Immediately recalculate all members with the new rules
      const recalcRes = await api.post('/settings/recalculate')
      setMessage(`✅ Settings saved & ${recalcRes.data.data?.updated ?? 0} members recalculated!`)

      // Refetch to get updated data with proper IDs
      await fetchSettings()
      setTimeout(() => setMessage(''), 5000)
    } catch (err: any) {
      setMessage('❌ Failed to save: ' + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  const handleRecalculate = async () => {
    setConfirmOpen(true)
  }

  const doRecalculate = async () => {
    setConfirmOpen(false)
    try {
      const res = await api.post('/settings/recalculate')
      setMessage(`✅ ${res.data.message}`)
      setTimeout(() => setMessage(''), 5000)
    } catch (err: any) {
      setMessage('❌ Failed: ' + err.response?.data?.message)
    }
  }

  const addBranch = () => {
    setSettings({
      ...settings,
      branches: [...settings.branches, { name: '', code: '', isActive: true, address: { woreda: '' } }]
    })
  }

  const updateBranch = (index: number, field: string, value: any) => {
    const branches = [...settings.branches]
    if (field === 'address') {
      branches[index] = { ...branches[index], address: { ...branches[index].address, ...value } }
    } else {
      branches[index] = { ...branches[index], [field]: value }
    }
    setSettings({ ...settings, branches })
  }

  const removeBranch = (index: number) => {
    const branches = settings.branches.filter((_: any, i: number) => i !== index)
    setSettings({ ...settings, branches })
  }

  if (loading) return <PageLoader />
  if (!settings) return <div className="text-center text-red-500">{t('dashboard.dashboard_fail')}</div>

  const tabs = [
    { id: 'contribution', label: t('common.contribution_rules'), icon: DollarSign },
    { id: 'system', label: t('common.system_settings'), icon: Settings },
    { id: 'recalculate', label: t('common.recalculate_all'), icon: RotateCcw }
  ]

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5 }} 
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('common.settings')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('common.settings')}</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? t('common.loading') : t('common.save_all_changes')}
        </button>
      </div>


      {message && (
        <div className={`p-4 rounded-lg ${message.includes('✅') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card">
        {/* Contribution Rules Tab */}
        {activeTab === 'contribution' && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold">{t('common.contribution_rules')}</h2>

            {/* Salary Calculation Settings */}
            <div className="p-4 bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">{t('common.salary_calculation_settings')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('common.fee_calculation_base')}</label>
                  <select
                    value={settings.contributionRules.salaryBased.calculationBase || 'Net'}
                    onChange={(e) => setSettings({
                      ...settings,
                      contributionRules: {
                        ...settings.contributionRules,
                        salaryBased: { ...settings.contributionRules.salaryBased, calculationBase: e.target.value }
                      }
                    })}
                    className="input"
                  >
                    <option value="Net">{t('common.net_salary')}</option>
                    <option value="Gross">{t('common.gross_salary')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('common.pension_deduction')}</label>
                  <input
                    type="number"
                    value={settings.contributionRules.salaryBased.pensionPercentage || 7}
                    onChange={(e) => setSettings({
                      ...settings,
                      contributionRules: {
                        ...settings.contributionRules,
                        salaryBased: { ...settings.contributionRules.salaryBased, pensionPercentage: Number(e.target.value) }
                      }
                    })}
                    className="input"
                  />
                </div>
              </div>
            </div>

            {/* Tax Brackets */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{t('common.tax_brackets')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th>{t('common.salary_threshold')}</th>
                      <th>{t('common.tax_rate')}</th>
                      <th>{t('common.flat_deduction')}</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {(settings.contributionRules.salaryBased.taxBrackets || []).map((bracket: any, index: number) => (
                      <tr key={index}>
                        <td>
                          {bracket.threshold > 999999 ? (
                            <span className="font-medium">
                              Over {settings.contributionRules.salaryBased.taxBrackets[index - 1]?.threshold}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 text-right">
                                {index === 0 ? '0' : (settings.contributionRules.salaryBased.taxBrackets[index - 1].threshold + 1)} - 
                              </span>
                              <input
                                type="number"
                                value={bracket.threshold}
                                onChange={(e) => {
                                  const brackets = [...settings.contributionRules.salaryBased.taxBrackets]
                                  brackets[index].threshold = Number(e.target.value)
                                  setSettings({ ...settings, contributionRules: { ...settings.contributionRules, salaryBased: { ...settings.contributionRules.salaryBased, taxBrackets: brackets } } })
                                }}
                                className="input w-28"
                              />
                            </div>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={bracket.rate}
                            onChange={(e) => {
                              const brackets = [...settings.contributionRules.salaryBased.taxBrackets]
                              brackets[index].rate = Number(e.target.value)
                              setSettings({ ...settings, contributionRules: { ...settings.contributionRules, salaryBased: { ...settings.contributionRules.salaryBased, taxBrackets: brackets } } })
                            }}
                            className="input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={bracket.deduction}
                            onChange={(e) => {
                              const brackets = [...settings.contributionRules.salaryBased.taxBrackets]
                              brackets[index].deduction = Number(e.target.value)
                              setSettings({ ...settings, contributionRules: { ...settings.contributionRules, salaryBased: { ...settings.contributionRules.salaryBased, taxBrackets: brackets } } })
                            }}
                            className="input"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Salary-Based - Government */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('common.salary_calculation_settings')}</h3>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th>{t('common.min_salary')}</th>
                      <th>{t('common.max_salary')}</th>
                      <th>{t('common.percentage')}</th>
                    </tr>
                  </thead>

                  <tbody className="table-body">
                    {settings.contributionRules.salaryBased.government.map((rule: any, index: number) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="number"
                            value={rule.minSalary}
                            onChange={(e) => {
                              const rules = [...settings.contributionRules.salaryBased.government]
                              rules[index].minSalary = Number(e.target.value)
                              setSettings({ ...settings, contributionRules: { ...settings.contributionRules, salaryBased: { ...settings.contributionRules.salaryBased, government: rules } } })
                            }}
                            className="input"
                          />
                        </td>
                        <td>
                          {rule.maxSalary > 999999 ? (
                            <span className="font-medium text-gray-500 ml-2">Over {rule.minSalary}</span>
                          ) : (
                            <input
                              type="number"
                              value={rule.maxSalary}
                              onChange={(e) => {
                                const rules = [...settings.contributionRules.salaryBased.government]
                                rules[index].maxSalary = Number(e.target.value)
                                setSettings({ ...settings, contributionRules: { ...settings.contributionRules, salaryBased: { ...settings.contributionRules.salaryBased, government: rules } } })
                              }}
                              className="input"
                            />
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.1"
                            value={rule.percentage}
                            onChange={(e) => {
                              const rules = [...settings.contributionRules.salaryBased.government]
                              rules[index].percentage = Number(e.target.value)
                              setSettings({ ...settings, contributionRules: { ...settings.contributionRules, salaryBased: { ...settings.contributionRules.salaryBased, government: rules } } })
                            }}
                            className="input"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fixed Fees */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('common.fixed_fees')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(settings.contributionRules.fixedFees).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1 capitalize">{t(`common.${key.toLowerCase()}`)}</label>
                    <input
                      type="number"
                      value={value as number}
                      onChange={(e) => setSettings({
                        ...settings,
                        contributionRules: {
                          ...settings.contributionRules,
                          fixedFees: { ...settings.contributionRules.fixedFees, [key]: Number(e.target.value) }
                        }
                      })}
                      className="input"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Business Fees */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('common.business_fees')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(settings.contributionRules.business).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1 capitalize">{t(`common.${key.toLowerCase()}`)}</label>
                    <input
                      type="number"
                      value={value as number}
                      onChange={(e) => setSettings({
                        ...settings,
                        contributionRules: {
                          ...settings.contributionRules,
                          business: { ...settings.contributionRules.business, [key]: Number(e.target.value) }
                        }
                      })}
                      className="input"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Investor Tiers */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('common.investor_tiers')}</h3>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th>Min Capital</th>
                      <th>Max Capital</th>
                      <th>{t('common.monthly_fee')}</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {settings.contributionRules.investor.map((rule: any, index: number) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="number"
                            value={rule.minCapital}
                            onChange={(e) => {
                              const rules = [...settings.contributionRules.investor]
                              rules[index].minCapital = Number(e.target.value)
                              setSettings({ ...settings, contributionRules: { ...settings.contributionRules, investor: rules } })
                            }}
                            className="input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={rule.maxCapital > 999999999999 ? '∞' : rule.maxCapital}
                            onChange={(e) => {
                              const rules = [...settings.contributionRules.investor]
                              rules[index].maxCapital = e.target.value === '∞' ? 999999999999 : Number(e.target.value)
                              setSettings({ ...settings, contributionRules: { ...settings.contributionRules, investor: rules } })
                            }}
                            className="input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={rule.fee}
                            onChange={(e) => {
                              const rules = [...settings.contributionRules.investor]
                              rules[index].fee = Number(e.target.value)
                              setSettings({ ...settings, contributionRules: { ...settings.contributionRules, investor: rules } })
                            }}
                            className="input"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Wing Fees - Art. 7 & 8 */}
            <div>
              <h3 className="text-lg font-semibold mb-1">{t('common.fixed_fees')}</h3>
              <p className="text-xs text-gray-500 mb-4">{t('common.contribution_rules')}</p>

              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employee Young/Women wing members</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'salary_1k_3k',   label: '1,000–3,000 Birr' },
                    { key: 'salary_3k_5k',   label: '3,001–5,000 Birr' },
                    { key: 'salary_5k_10k',  label: '5,001–10,000 Birr' },
                    { key: 'salary_10k_plus',label: '>10,000 Birr' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium mb-1">{label}</label>
                      <input
                        type="number"
                        value={settings.contributionRules.wing[key] ?? ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          contributionRules: {
                            ...settings.contributionRules,
                            wing: { ...settings.contributionRules.wing, [key]: Number(e.target.value) }
                          }
                        })}
                        className="input"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('common.business_fees')}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'farmer',         label: 'Art.8a Farmer/Pastoral (Birr/month)' },
                    { key: 'informal',       label: 'Art.8b Informal (Birr/month)' },
                    { key: 'micro_small',    label: 'Art.8c Micro/Small (Birr/month)' },
                    { key: 'general_annual', label: 'Art.8d General (Birr/year)' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium mb-1">{label}</label>
                      <input
                        type="number"
                        value={settings.contributionRules.wing[key] ?? ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          contributionRules: {
                            ...settings.contributionRules,
                            wing: { ...settings.contributionRules.wing, [key]: Number(e.target.value) }
                          }
                        })}
                        className="input"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Distribution */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('common.revenue_distribution')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('common.hq_percentage')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.distribution.hqPercentage}
                    onChange={(e) => setSettings({
                      ...settings,
                      distribution: { ...settings.distribution, hqPercentage: Number(e.target.value) }
                    })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('common.sector_unit_percentage')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.distribution.branchPercentage}
                    onChange={(e) => setSettings({
                      ...settings,
                      distribution: { ...settings.distribution, branchPercentage: Number(e.target.value) }
                    })}
                    className="input"
                  />
                </div>
              </div>
            </div>
          </div>
        )}


        {activeTab === 'system' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">{t('common.system_settings')}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.org_name')}</label>
                <input
                  type="text"
                  value={settings.system.organizationName}
                  onChange={(e) => setSettings({ ...settings, system: { ...settings.system, organizationName: e.target.value } })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.default_currency')}</label>
                <select
                  value={settings.system.currency}
                  onChange={(e) => setSettings({ ...settings, system: { ...settings.system, currency: e.target.value } })}
                  className="input"
                >
                  <option value="ETB">ETB</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.fiscal_year_start')}</label>
                <select
                  value={settings.system.fiscalYearStart}
                  onChange={(e) => setSettings({ ...settings, system: { ...settings.system, fiscalYearStart: Number(e.target.value) } })}
                  className="input"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <option key={m} value={m}>
                      {t(`common.${['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][m-1]}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.defaulter_threshold')}</label>
                <input
                  type="number"
                  value={settings.system.defaulterThreshold}
                  onChange={(e) => setSettings({ ...settings, system: { ...settings.system, defaulterThreshold: Number(e.target.value) } })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.receipt_prefix')}</label>
                <input
                  type="text"
                  value={settings.system.receiptPrefix}
                  onChange={(e) => setSettings({ ...settings, system: { ...settings.system, receiptPrefix: e.target.value } })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.default_language')}</label>
                <select
                  value={settings.system.defaultLanguage}
                  onChange={(e) => setSettings({ ...settings, system: { ...settings.system, defaultLanguage: e.target.value } })}
                  className="input"
                >
                  <option value="en">English</option>
                  <option value="am">Amharic</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium">{t('common.sms_notifications')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.sms_notifications')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.system.enableSmsNotifications}
                    onChange={(e) => setSettings({ ...settings, system: { ...settings.system, enableSmsNotifications: e.target.checked } })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium">{t('common.email_notifications')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.email_notifications')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.system.enableEmailNotifications}
                    onChange={(e) => setSettings({ ...settings, system: { ...settings.system, enableEmailNotifications: e.target.checked } })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Recalculate Tab */}
        {activeTab === 'recalculate' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">{t('common.recalculate_all')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('common.recalculate_warning_text')}
              </p>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('common.recalculate_all')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {t('common.recalculate_warning_text')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={handleRecalculate} className="btn btn-primary flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                {t('common.recalculate_all_members_now')}
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('common.recalculate_warning_text')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Save Button at Bottom */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? t('common.loading') : t('common.save_all_changes')}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        variant="info"
        title={t('common.recalculate_all')}
        message={t('common.recalculate_warning_text')}
        confirmLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        onConfirm={doRecalculate}
        onCancel={() => setConfirmOpen(false)}
      />
    </motion.div>
  )
}
