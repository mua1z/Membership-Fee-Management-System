import { useState, useEffect } from 'react'
import api from '../lib/api'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Member {
  _id?: string
  fullName: string
  gender: string
  age: number
  phone: string
  email: string
  nationalId: string
  address: { region: string; city: string; woreda: string }
  branch: string
  cluster: string
  sector: string
  membershipType: string
  paymentDay: number
  paymentSchedule?: {
    month: number
    year: number
    expectedDate: string
    status: string
    actualPaymentDate: string | null
  }[]
  financial: {
    salary: number
    employmentType: string
    currency: string
    allowances: number
    occupationType: string
    estimatedIncome: number
    businessType: string
    businessName: string
    employees: number
    income: number
    capital: number
    investmentType: string
    customMonthlyFee?: number | null
    [key: string]: any
  }
  sectorUnitId?: number
  memberCategoryId?: number
  sectorUnit?: { id: number; name: string; sectorTypeId: number }
  wing?: { wingType: string }
}

interface MemberModalProps {
  member: Member | null
  onClose: () => void
  onSuccess: () => void
}

export default function MemberModal({ member, onClose, onSuccess }: MemberModalProps) {
  const { t } = useTranslation()
  
  // Dynamic label maps based on sector type
  const SECTOR_UNIT_LABELS: Record<string, string> = {
    'Institution': t('common.institution'),
    'Rural Cluster': t('common.rural'),
    'Urban Woreda': t('common.urban'),
    'Secondary School': t('common.secondary_school'),
    'Health Institution': t('common.health_institution')
  }

  const [formData, setFormData] = useState<Member>({
    fullName: '',
    gender: 'Male',
    age: 0,
    phone: '',
    email: '',
    nationalId: '',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '01' },
    branch: 'Dire Dawa Main',
    cluster: 'Urban',
    sector: '',
    membershipType: 'Salary-Based',
    paymentDay: 1,
    financial: {
      salary: 0,
      employmentType: 'Private',
      currency: 'ETB',
      allowances: 0,
      occupationType: 'Informal',
      estimatedIncome: 0,
      businessType: '',
      businessName: '',
      employees: 0,
      income: 0,
      capital: 0,
      investmentType: '',
      customMonthlyFee: null
    },
    sectorUnitId: undefined,
    memberCategoryId: undefined
  })
  
  const [sectorTypes, setSectorTypes] = useState<any[]>([])
  const [sectors, setSectors] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  const [selectedSectorType, setSelectedSectorType] = useState('')
  const [selectedSectorId, setSelectedSectorId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (member) {
      setFormData(member)
      if (member.sectorUnit) {
        setSelectedSectorId(String(member.sectorUnit.id))
      }
      if (member.memberCategoryId) {
        setSelectedCategoryId(String(member.memberCategoryId))
      }
    }
  }, [member])

  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    api.get('/sector-types').then(res => setSectorTypes(res.data))
    api.get('/settings').then(res => setSettings(res.data)).catch(console.error)
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
      api.get(`/sectors/${selectedSectorId}/categories`).then(res => setCategories(res.data))
    } else {
      setCategories([])
    }
  }, [selectedSectorId])

  useEffect(() => {
    if (selectedCategoryId) {
      const cat = categories.find(c => String(c.id) === selectedCategoryId)
      if (cat) {
        const name = cat.name.toLowerCase()
        let type = 'Non-Salary'
        if (name.includes('wing')) type = 'Wing'
        else if (name.includes('employee member') || name === 'employee') type = 'Salary-Based'
        else if (name.includes('enterprise')) type = 'Business'
        else if (name.includes('student')) type = 'Student'
        else if (name.includes('investor')) type = 'Investor'
        else if (name.includes('resident') || name.includes('farmer')) type = 'Non-Salary'
        
        setFormData(prev => ({ 
          ...prev, 
          membershipType: type, 
          memberCategoryId: Number(selectedCategoryId),
          wing: type === 'Wing' ? { wingType: cat.name.replace(' Wing', '') } : undefined
        }))
      }
    }
  }, [selectedCategoryId, categories])

  useEffect(() => {
    if (selectedSectorId) {
      setFormData(prev => ({ ...prev, sectorUnitId: Number(selectedSectorId) }))
    }
  }, [selectedSectorId])

  const sectorUnitLabel = SECTOR_UNIT_LABELS[selectedSectorType] || t('common.sector_unit')
  const sectorUnitPlaceholder = t('common.search') + '...'

  const calculateFinancials = () => {
    const gross = formData.financial.salary || 0;
    if (gross <= 0) return null;

    // Tax calculation
    const taxBrackets = settings?.salaryBased?.taxBrackets;
    let tax = 0;
    if (taxBrackets && Array.isArray(taxBrackets) && taxBrackets.length > 0) {
      const sorted = [...taxBrackets].sort((a, b) => a.threshold - b.threshold);
      let appliedBracket = sorted[sorted.length - 1];
      for (const b of sorted) {
        if (gross <= b.threshold) {
          appliedBracket = b;
          break;
        }
      }
      tax = Math.max(0, (gross * (appliedBracket.rate || 0)) - (appliedBracket.deduction || 0));
    } else {
      if (gross <= 2000) tax = 0;
      else if (gross <= 4000) tax = (gross * 0.15) - 300;
      else if (gross <= 7000) tax = (gross * 0.20) - 500;
      else if (gross <= 10000) tax = (gross * 0.25) - 850;
      else if (gross <= 14000) tax = (gross * 0.30) - 1350;
      else tax = (gross * 0.35) - 2050;
    }

    // Pension calculation
    const pensionPerc = settings?.salaryBased?.pensionPercentage ?? 7;
    const pension = gross * (pensionPerc / 100);

    // Net Salary
    const netSalary = Math.max(0, gross - tax - pension);

    // Fee Calculation
    const calcBase = settings?.salaryBased?.calculationBase || 'Net';
    const salaryToUse = calcBase === 'Net' ? netSalary : gross;

    const brackets = settings?.salaryBased?.[formData.financial.employmentType?.toLowerCase()] || settings?.salaryBased?.private || [];
    let percentage = 0;

    if (brackets.length > 0) {
      for (const bracket of brackets) {
        if (salaryToUse >= bracket.minSalary && salaryToUse <= bracket.maxSalary) {
          percentage = bracket.percentage;
          break;
        }
      }
      if (!percentage && salaryToUse > brackets[brackets.length - 1].maxSalary) {
        percentage = brackets[brackets.length - 1].percentage;
      }
    } else {
      if (salaryToUse <= 4000) percentage = 0.6;
      else if (salaryToUse <= 5000) percentage = 0.8;
      else if (salaryToUse <= 6000) percentage = 1.0;
      else if (salaryToUse <= 7000) percentage = 1.2;
      else if (salaryToUse <= 8000) percentage = 1.4;
      else if (salaryToUse <= 9000) percentage = 1.6;
      else if (salaryToUse <= 10000) percentage = 1.8;
      else percentage = 2.0;
    }

    const monthlyFee = salaryToUse * (percentage / 100);

    return { tax, pension, netSalary, percentage, monthlyFee };
  };

  const calculated = (formData.membershipType === 'Salary-Based') ? calculateFinancials() : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (member?._id) {
        await api.put(`/members/${member._id}`, formData)
      } else {
        await api.post('/members', formData)
      }
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{member ? t('common.edit') : t('common.register')} {t('common.members')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('common.personal_info')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.full_name')} *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.sex')} *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  className="input"
                >
                  <option value="Male">{t('common.male')}</option>
                  <option value="Female">{t('common.female')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.phone')} *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              <div className="flex items-end pb-2">
                <details className="w-full">
                  <summary className="text-xs font-bold text-primary cursor-pointer hover:underline">{t('common.show_additional_fields')}</summary>
                  <div className="grid grid-cols-2 gap-2 mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500">{t('common.age')}</label>
                      <input type="number" value={formData.age} onChange={(e) => setFormData(prev => ({ ...prev, age: Number(e.target.value) }))} className="input py-1 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500">{t('common.national_id')}</label>
                      <input type="text" value={formData.nationalId} onChange={(e) => setFormData(prev => ({ ...prev, nationalId: e.target.value }))} className="input py-1 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase font-bold text-gray-500">{t('common.email')}</label>
                      <input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="input py-1 text-sm" />
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* Sector / Membership Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('common.membership_details')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.sector_type')} *</label>
                <select
                  value={selectedSectorType}
                  onChange={(e) => {
                    setSelectedSectorType(e.target.value)
                    setSelectedSectorId('')
                    setSelectedCategoryId('')
                    setSectors([])
                    setCategories([])
                  }}
                  className="input"
                  required={!member}
                >
                  <option value="">{t('common.search')}...</option>
                  {sectorTypes.map(t_obj => <option key={t_obj.id} value={t_obj.name}>{t_obj.name === 'Institution' ? t('common.institution') : t_obj.name === 'Rural Cluster' ? t('common.rural') : t_obj.name === 'Urban Woreda' ? t('common.urban') : t_obj.name === 'Secondary School' ? t('common.secondary_school') : t_obj.name === 'Health Institution' ? t('common.health_institution') : t_obj.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{sectorUnitLabel} *</label>
                <select
                  value={selectedSectorId}
                  onChange={(e) => {
                    setSelectedSectorId(e.target.value)
                    setSelectedCategoryId('')
                    setCategories([])
                  }}
                  className="input"
                  required
                  disabled={!selectedSectorType && !member}
                >
                  <option value="">{sectorUnitPlaceholder}</option>
                  {sectors.map(s => <option key={s.id} value={s.id}>{t(`common.${s.name}`, { defaultValue: s.name })}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.category')} *</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="input"
                  required
                  disabled={!selectedSectorId && !member}
                >
                  <option value="">{t('common.search')}...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{t(`common.${c.name}`, { defaultValue: c.name })}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('common.financial_info')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(formData.membershipType === 'Salary-Based') && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('common.salary')}</label>
                    <input
                      type="number"
                      value={formData.financial.salary}
                      onChange={(e) => setFormData(prev => ({ ...prev, financial: { ...prev.financial, salary: Number(e.target.value) } }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('common.employment_type')}</label>
                    <select
                      value={formData.financial.employmentType}
                      onChange={(e) => setFormData(prev => ({ ...prev, financial: { ...prev.financial, employmentType: e.target.value } }))}
                      className="input"
                    >
                      <option value="Government">{t('common.government')}</option>
                      <option value="Private">{t('common.private')}</option>
                      <option value="NGO">{t('common.ngo')}</option>
                    </select>
                  </div>
                </>
              )}

              {calculated && (
                <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700/50">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t('common.income_tax')}</label>
                    <p className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300">{calculated.tax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ETB</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t('common.pension')}</label>
                    <p className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300">{calculated.pension.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ETB</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t('common.net_salary')}</label>
                    <p className="text-sm font-mono font-bold text-primary">{calculated.netSalary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ETB</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tier (%)</label>
                    <p className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300">{calculated.percentage}%</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">{t('common.monthly_fee')}</label>
                    <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">{calculated.monthlyFee.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ETB</p>
                  </div>
                </div>
              )}

              {formData.membershipType === 'Non-Salary' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('common.occupation')}</label>
                    <select
                      value={formData.financial.occupationType}
                      onChange={(e) => setFormData(prev => ({ ...prev, financial: { ...prev.financial, occupationType: e.target.value } }))}
                      className="input"
                    >
                      <option value="Farmer">{t('common.farmer')}</option>
                      <option value="Pastoralist">{t('common.pastoralist')}</option>
                      <option value="Labor">{t('common.labor')}</option>
                      <option value="Informal">{t('common.informal')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('common.estimated_income')}</label>
                    <input
                      type="number"
                      value={formData.financial.estimatedIncome}
                      onChange={(e) => setFormData(prev => ({ ...prev, financial: { ...prev.financial, estimatedIncome: Number(e.target.value) } }))}
                      className="input"
                    />
                  </div>
                </>
              )}

              {formData.membershipType === 'Business' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('common.business_type')} *</label>
                    <select
                      value={formData.financial.businessType}
                      onChange={(e) => setFormData(prev => ({ ...prev, financial: { ...prev.financial, businessType: e.target.value } }))}
                      className="input"
                      required
                    >
                      <option value="">{t('common.search')}...</option>
                      <option value="Micro">{t('common.micro')}</option>
                      <option value="Small">{t('common.small')}</option>
                      <option value="Medium">{t('common.medium')}</option>
                    </select>
                  </div>
                </>
              )}

              {formData.membershipType === 'Wing' && (() => {
                const cat = categories.find(c => String(c.id) === selectedCategoryId);
                const isEmployeeWing = cat?.name.toLowerCase().includes('employee');
                
                return (
                  <>
                    {isEmployeeWing ? (
                      <div>
                        <label className="block text-sm font-medium mb-1">{t('common.salary')}</label>
                        <input
                          type="number"
                          value={formData.financial.salary}
                          onChange={(e) => setFormData(prev => ({ ...prev, financial: { ...prev.financial, salary: Number(e.target.value) } }))}
                          className="input"
                          placeholder="0"
                          required
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium mb-1">{t('common.occupation')}</label>
                        <select
                          value={formData.financial.occupationType}
                          onChange={(e) => setFormData(prev => ({ ...prev, financial: { ...prev.financial, occupationType: e.target.value } }))}
                          className="input"
                          required
                        >
                          <option value="General">{t('common.general')}</option>
                          <option value="Farmer">{t('common.farmer')}</option>
                          <option value="Pastoralist">{t('common.pastoralist')}</option>
                          <option value="Informal">{t('common.informal')}</option>
                          <option value="Micro Enterprise">{t('common.micro_enterprise')}</option>
                          <option value="Small Enterprise">{t('common.small_enterprise')}</option>
                        </select>
                      </div>
                    )}
                  </>
                );
              })()}
              {formData.membershipType === 'Investor' && (
                <div>
                  <label className="block text-sm font-medium mb-1">{t('common.capital')} (ETB) *</label>
                  <input
                    type="number"
                    value={formData.financial.capital}
                    onChange={(e) => setFormData(prev => ({ ...prev, financial: { ...prev.financial, capital: Number(e.target.value) } }))}
                    className="input"
                    placeholder="0"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? t('common.loading') : (member ? t('common.update') : t('common.register'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
