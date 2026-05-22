import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Search, Filter, Plus, Upload, Download, Edit2, Trash2, X, Loader2, ChevronLeft, ChevronRight, Users, Wallet, Banknote, ShieldAlert } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import MemberModal from '../components/MemberModal'
import ImportModal from '../components/ImportModal'
import FastEntryModal from '../components/FastEntryModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { getCurrentEthiopianPeriod } from '../utils/ethiopianCalendar'

interface Member {
  _id: string
  memberId: string
  fullName: string
  gender: string
  age: number
  phone: string
  email: string
  nationalId: string
  address: { region: string; city: string; woreda: string }
  branch?: string
  cluster?: string
  sector?: string
  sectorUnitId?: number
  memberCategoryId?: number
  sectorUnit?: { id: number, name: string, sectorTypeId: number }
  memberCategory?: { id: number, name: string }
  membershipType: string
  subType: string
  paymentDay: number
  paymentSchedule?: {
    month: number
    year: number
    expectedDate: string
    status: string
    actualPaymentDate: string | null
  }[]
  paymentScheduleSummary?: {
    total: number
    paid: number
    unpaid: number
    year: number
  }
  financial: {
    salary: number
    currency: string
    employmentType: string
    allowances?: number
    occupationType?: string
    estimatedIncome?: number
    businessType?: string
    businessName?: string
    employees?: number
    income?: number
    capital?: number
    investmentType?: string
  }
  contribution: {
    monthlyFee: number
    percentage: number
    annualFee: number
  }
  netSalary: {
    grossSalary: number
    pensionDeduction: number
    taxDeduction: number
    totalDeductions: number
    netSalary: number
    contributionFee: number
    finalNetSalary: number
  }
  status: string
  paymentStatus: string
  registrationDate: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  pages: number
}

// Dynamic label maps (for internal logic, labels will be translated via t())
const SECTOR_UNIT_LABELS: Record<string, string> = {
  'Institution': 'common.government_office',
  'Rural Cluster': 'common.rural_sector',
  'Urban Woreda': 'common.urban_woreda',
  'Secondary School': 'common.secondary_school',
  'Health Institution': 'common.health_institution'
}
const SECTOR_TYPE_DISPLAY: Record<string, string> = {
  'Institution': 'common.government_institutions',
  'Rural Cluster': 'common.rural',
  'Urban Woreda': 'common.urban',
  'Secondary School': 'common.secondary_school',
  'Health Institution': 'common.health_institution'
}

export default function Members() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [members, setMembers] = useState<Member[]>([])
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 15, pages: 0 })
  const [summary, setSummary] = useState({ totalMembers: 0, totalMonthlyRevenue: 0, totalYearlyRevenue: 0 })
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ 
    cluster: '', 
    branch: '', 
    sector: '',
    membershipType: '', 
    status: '', 
    paymentStatus: '',
    billingYear: getCurrentEthiopianPeriod().year,
    billingMonth: getCurrentEthiopianPeriod().month
  })
  const [showFilters, setShowFilters] = useState(true)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showFastEntryModal, setShowFastEntryModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)

  // Hierarchy Data
  const [sectorTypes, setSectorTypes] = useState<any[]>([])
  const [sectors, setSectors] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  // Hierarchy Selection
  const [selectedSectorType, setSelectedSectorType] = useState('')
  const [selectedSectorId, setSelectedSectorId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [hasFiltered, setHasFiltered] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deletingBulk, setDeletingBulk] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)

  // Confirm dialogs
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [confirmClearAll, setConfirmClearAll] = useState(false)

  const fetchMembers = async (force = false) => {
    if (!hasFiltered && !force) return
    setLoading(true)
    try {
      const params: any = { page: pagination.page, limit: pagination.limit, search }
      if (filters.cluster) params.cluster = filters.cluster
      if (filters.branch) params.branch = filters.branch
      if (filters.sector) params.sector = filters.sector
      if (filters.membershipType) params.membershipType = filters.membershipType
      if (filters.status) params.status = filters.status
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus
      params.billingYear = filters.billingYear
      params.billingMonth = filters.billingMonth

      // New Hierarchy Params
      if (selectedSectorType) params.sectorType = selectedSectorType
      if (selectedSectorId) params.sectorId = selectedSectorId
      if (selectedCategoryId) params.categoryId = selectedCategoryId

      const res = await api.get('/members', { params })
      setMembers(res.data.data)
      // Preserve the user-selected limit; only update total/page/pages from server
      setPagination(prev => ({
        ...prev,
        total: res.data.pagination.total,
        page:  res.data.pagination.page,
        pages: res.data.pagination.pages
      }))
      if (res.data.summary) {
        setSummary(res.data.summary)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Clear selection when members change (page/filter change)
  useEffect(() => {
    setSelectedIds([])
  }, [members])

  // Auto-fetch when filters/page change ONLY IF user has clicked display
  useEffect(() => {
    if (hasFiltered) {
      fetchMembers()
    }
  }, [pagination.page, pagination.limit, search, filters, selectedSectorId, selectedCategoryId, hasFiltered])

  // Fetch Sector Types on mount
  useEffect(() => {
    const fetchSectorTypes = async () => {
      try {
        const res = await api.get('/sector-types')
        setSectorTypes(res.data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchSectorTypes()
  }, [])

  // Fetch all categories for global filtering
  useEffect(() => {
    const fetchAllCategories = async () => {
      try {
        const res = await api.get('/member-categories')
        setCategories(res.data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchAllCategories()
  }, [])

  // Fetch Sectors when Type changes
  useEffect(() => {
    const fetchSectors = async () => {
      if (!selectedSectorType) {
        setSectors([])
        setSelectedSectorId('')
        return
      }
      try {
        const res = await api.get(`/sectors?type=${selectedSectorType}`)
        setSectors(res.data)
        setSelectedSectorId('')
      } catch (err) {
        console.error(err)
      }
    }
    fetchSectors()
  }, [selectedSectorType])

  // Fetch Categories when Sector changes (refined for global/local sync)
  useEffect(() => {
    const fetchCategories = async () => {
      const targetSectorId = user?.role === 'sector_officer' ? user?.sectorUnitId : selectedSectorId;
      if (!targetSectorId) {
        // If no sector, keep the global categories fetched on mount
        return
      }
      try {
        const res = await api.get(`/sectors/${targetSectorId}/categories`)
        setCategories(res.data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchCategories()
  }, [selectedSectorId, user?.role, user?.sectorUnitId])

  const handleDelete = async (id: string) => {
    setConfirmDelete({ open: true, id })
  }

  const doDelete = async () => {
    const id = confirmDelete.id
    setConfirmDelete({ open: false, id: null })
    if (!id) return
    try {
      await api.delete(`/members/${id}`)
      fetchMembers()
    } catch (error: any) {
      console.error(error)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === members.length && members.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(members.map(m => m._id))
    }
  }

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setConfirmBulkDelete(true)
  }

  const doBulkDelete = async () => {
    setConfirmBulkDelete(false)
    setDeletingBulk(true)
    try {
      await api.post('/members/bulk-delete', { ids: selectedIds })
      setSelectedIds([])
      fetchMembers()
    } catch (error: any) {
      console.error(error)
    } finally {
      setDeletingBulk(false)
    }
  }

  const handleBulkDeleteAll = async () => {
    setConfirmClearAll(true)
  }

  const doClearAll = async () => {
    setConfirmClearAll(false)
    setDeletingAll(true)
    try {
      await api.post('/members/bulk-delete-all')
      setSelectedIds([])
      fetchMembers()
    } catch (error: any) {
      console.error(error)
    } finally {
      setDeletingAll(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      // Build same params as current filter view
      const params: any = { page: 1, limit: 100000, search }
      if (filters.cluster)       params.cluster       = filters.cluster
      if (filters.branch)        params.branch        = filters.branch
      if (filters.sector)        params.sector        = filters.sector
      if (filters.membershipType)params.membershipType = filters.membershipType
      if (filters.status)        params.status        = filters.status
      if (filters.paymentStatus) params.paymentStatus  = filters.paymentStatus
      params.billingYear  = filters.billingYear
      params.billingMonth = filters.billingMonth

      if (selectedSectorType) params.sectorType = selectedSectorType
      if (selectedSectorId) params.sectorId = selectedSectorId
      if (selectedCategoryId) params.categoryId = selectedCategoryId

      const res = await api.get('/members', { params })
      const exportedMembers = res.data.data;
      
      const totalMembers = exportedMembers.length;
      const totalMonthlyRevenue = exportedMembers.reduce((sum: number, m: any) => sum + (m.contribution?.monthlyFee || 0), 0);
      const totalQuarterlyRevenue = totalMonthlyRevenue * 3;
      const totalYearlyRevenue = totalMonthlyRevenue * 12;

      // Determine sector context for display
      const sectorContext = selectedSectorId ? (sectors.find(s => String(s.id) === String(selectedSectorId))?.name || filters.branch) 
                            : selectedSectorType ? selectedSectorType 
                            : filters.cluster || 'All Sectors';
      const categoryContext = selectedCategoryId ? categories.find(c => String(c.id) === String(selectedCategoryId))?.name 
                              : filters.membershipType || 'All Categories';

      const aoaData = [
        // Row 1: Title
        ['የድሬዳዋ አስተዳደር ብልጽግና ፓርቲ የወር ደመወዝተኛ አመራርና አባላት የአባልነት መዋጮ ዕቅድ', '', '', '', '', '', '', '', ''],
        // Row 2: Summary Headers
        ['ወረዳ/ክላስተር ይምረጡ', 'ሩብ አመት', 'በጀት አመት', 'ወር', 'ጠቅላላ አባላት', 'በወር የሚሰበሰብ ብር', 'በሩብ አመት የሚሰበሰብ ብር', 'በአመት የሚሰበሰብ ብር', ''],
        // Row 3: Summary Values
        [t(`common.${sectorContext}`, { defaultValue: sectorContext }), '', '', '', totalMembers, totalMonthlyRevenue, totalQuarterlyRevenue, totalYearlyRevenue, ''],
        // Row 4: Specific Context
        [t(`common.${sectorContext}`, { defaultValue: sectorContext }), t(`common.${categoryContext}`, { defaultValue: categoryContext }), '', '', '', '', '', '', ''],
        // Row 5: Data Headers
        ['ተ.ቁ.', 'ሙሉ ስም', 'ጾታ', 'ጥቅል የወር ደመወዝ መጠን', 'የደመወዝ ገቢ ግብር', 'ጡረታ', 'የተጣራ የወር ደመወዝ መጠን', 'የክፍያ % መጠን', 'የአባሉ ወርሃዊ ክፍያ']
      ];
      
      // Add data rows
      exportedMembers.forEach((m: any, index: number) => {
         const isSalary = m.membershipType === 'Salary-Based';
         aoaData.push([
           index + 1,
           m.fullName,
           m.gender === 'Male' ? 'ወ' : m.gender === 'Female' ? 'ሴ' : m.gender,
           isSalary ? (m.financial?.salary || 0) : 0,
           isSalary ? (m.netSalary?.taxDeduction || 0) : 0,
           isSalary ? (m.netSalary?.pensionDeduction || 0) : 0,
           isSalary ? (m.netSalary?.netSalary || 0) : 0,
           isSalary ? `${m.contribution?.percentage || 2}%` : '0%',
           m.contribution?.monthlyFee || 0
         ]);
      });

      const XLSX = await import('xlsx-js-style');
      const ws = XLSX.utils.aoa_to_sheet(aoaData);
      
      // Set Column Widths
      ws['!cols'] = [
        { wch: 6 },  // A: ተ.ቁ.
        { wch: 30 }, // B: ሙሉ ስም
        { wch: 6 },  // C: ጾታ
        { wch: 20 }, // D: ጥቅል የወር ደመወዝ መጠን
        { wch: 15 }, // E: የደመወዝ ገቢ ግብር / ጠቅላላ አባላት
        { wch: 15 }, // F: ጡረታ / በወር የሚሰበሰብ
        { wch: 20 }, // G: የተጣራ የወር ደመወዝ / በሩብ አመት
        { wch: 15 }, // H: የክፍያ % መጠን / በአመት
        { wch: 20 }  // I: የአባሉ ወርሃዊ ክፍያ
      ];

      // Merge cells
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Title
        { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // Row 3 "የገጠር ክላስተር"
        { s: { r: 3, c: 1 }, e: { r: 3, c: 8 } }  // Row 4 Category Context
      ];

      // Helper function to apply styles safely
      const applyStyle = (r: number, c: number, style: any) => {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };
        
        // Deep merge style so we don't lose default border if not explicitly overridden
        ws[cellAddress].s = { ...ws[cellAddress].s, ...style };
      };

      const defaultBorder = {
        top: { style: 'thin', color: { rgb: "000000" } },
        bottom: { style: 'thin', color: { rgb: "000000" } },
        left: { style: 'thin', color: { rgb: "000000" } },
        right: { style: 'thin', color: { rgb: "000000" } }
      };

      // Loop through all cells to add borders and basic alignment
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:I5');
      for (let R = 0; R <= range.e.r; ++R) {
        for (let C = 0; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };
          
          ws[cellAddress].s = {
            border: defaultBorder,
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            font: { name: 'Nyala', sz: 11 }
          };
        }
      }

      // Row 1 (Title Row)
      applyStyle(0, 0, {
        font: { name: 'Nyala', sz: 16, bold: true, underline: true },
        alignment: { horizontal: 'center', vertical: 'center' }
      });

      // Row 2 (Summary Headers)
      for(let c = 0; c <= 3; c++) applyStyle(1, c, { fill: { fgColor: { rgb: "4F81BD" } }, font: { color: { rgb: "FFFFFF" }, bold: true } });
      applyStyle(1, 4, { fill: { fgColor: { rgb: "9BBB59" } }, font: { color: { rgb: "FFFFFF" }, bold: true } });
      for(let c = 5; c <= 8; c++) applyStyle(1, c, { fill: { fgColor: { rgb: "8064A2" } }, font: { color: { rgb: "FFFFFF" }, bold: true } });

      // Row 3 (Summary Values)
      applyStyle(2, 0, { fill: { fgColor: { rgb: "D9D9D9" } }, font: { bold: true } });
      applyStyle(2, 4, { fill: { fgColor: { rgb: "EAF1DD" } }, font: { bold: true } });
      for(let c = 5; c <= 7; c++) applyStyle(2, c, { font: { bold: true, underline: true } });

      // Row 4 (Specific Context)
      applyStyle(3, 0, { fill: { fgColor: { rgb: "F2F2F2" } }, font: { bold: true } });
      applyStyle(3, 1, { fill: { fgColor: { rgb: "F2F2F2" } }, font: { bold: true } });

      // Row 5 (Data Headers)
      for(let c = 0; c <= 8; c++) applyStyle(4, c, { font: { bold: true } });

      // Left-align names (Col 1) in data rows
      for (let R = 5; R <= range.e.r; ++R) {
        if(ws[XLSX.utils.encode_cell({ r: R, c: 1 })]) {
           ws[XLSX.utils.encode_cell({ r: R, c: 1 })].s.alignment = { ...ws[XLSX.utils.encode_cell({ r: R, c: 1 })].s.alignment, horizontal: 'left' };
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Members');
      // Filename includes active filters so user knows what was exported
      const filterTag = [
        filters.branch, filters.cluster, filters.membershipType,
        filters.status, filters.paymentStatus
      ].filter(Boolean).join('_') || 'All'
      XLSX.writeFile(wb, `Members-${filterTag}-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Active': 'badge-success',
      'Inactive': 'badge-secondary',
      'Suspended': 'badge-danger',
      'Defaulted': 'badge-danger'
    }
    return <span className={`badge ${colors[status] || 'badge-info'}`}>{t(`common.${status.toLowerCase()}`)}</span>
  }

  const getPaymentBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Paid': 'badge-success',
      'Unpaid': 'badge-danger',
      'Partial': 'badge-warning',
      'Overpaid': 'badge-info',
      'Defaulted': 'badge-danger'
    }
    return <span className={`badge ${colors[status] || 'badge-info'}`}>{t(`common.${status.toLowerCase()}`)}</span>
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
          <h1 className="text-2xl font-bold">{t('common.members')}</h1>
          {user?.role === 'sector_officer'
            ? <p className="text-gray-600 dark:text-gray-400">{t('common.showing_members_assigned_sector')}</p>
            : <p className="text-gray-600 dark:text-gray-400">{t('common.manage_all_registered_members')}</p>
          }
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <button 
              onClick={handleBulkDeleteAll} 
              disabled={deletingAll}
              className="btn bg-slate-200 dark:bg-slate-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2"
              title={t('common.clear_all')}
            >
              {deletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {t('common.clear_all')}
            </button>
          )}
          {user?.role !== 'expert' && selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete} 
              disabled={deletingBulk}
              className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 animate-in fade-in slide-in-from-right-4"
            >
              {deletingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {t('common.delete_selected')} ({selectedIds.length})
            </button>
          )}
          {user?.role !== 'expert' && (
            <div className="flex items-center gap-2">
            <button onClick={() => { setEditingMember(null); setShowMemberModal(true) }} className="btn btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {t('common.add_member')}
            </button>
            <button onClick={() => setShowFastEntryModal(true)} className="btn btn-primary bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t('common.fast_entry')}
            </button>
            <button onClick={() => setShowImportModal(true)} className="btn btn-secondary flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {t('common.import')}
            </button>
          </div>
          )}
          <button onClick={handleExport} disabled={exporting} className="btn btn-secondary flex items-center gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? t('common.loading') : `${t('common.export')}${Object.values(filters).some(v => v !== '' && v !== filters.billingYear && v !== filters.billingMonth) || search ? ` (${t('common.filter')})` : ''}`}
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }}
              placeholder={t('common.search_placeholder_members')}
              className="input pl-10"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {t('common.filter')}
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {user?.role !== 'sector_officer' && (
                <>
                  <select
                value={selectedSectorType}
                onChange={(e) => { 
                  setSelectedSectorType(e.target.value);
                  setSelectedSectorId('');
                  setSelectedCategoryId('');
                  setPagination(prev => ({ ...prev, page: 1 })) 
                }}
                className="input"
              >
                <option value="">{t('common.sector_type')}</option>
                {sectorTypes.map(st => (
                  <option key={st.id} value={st.name}>{t(SECTOR_TYPE_DISPLAY[st.name] || st.name)}</option>
                ))}
              </select>

              <select
                value={selectedSectorId}
                disabled={!selectedSectorType}
                onChange={(e) => { 
                  setSelectedSectorId(e.target.value);
                  setSelectedCategoryId('');
                  setPagination(prev => ({ ...prev, page: 1 })) 
                }}
                className="input"
              >
                <option value="">{selectedSectorType ? t(SECTOR_UNIT_LABELS[selectedSectorType] || 'common.unit') : t('common.unit')}</option>
                {sectors.map(s => (
                  <option key={s.id} value={s.id}>{t(`common.${s.name}`, { defaultValue: s.name })}</option>
                ))}
              </select>
              </>
              )}

              <select
                value={selectedCategoryId}
                onChange={(e) => { 
                  setSelectedCategoryId(e.target.value); 
                  setPagination(prev => ({ ...prev, page: 1 })) 
                }}
                className="input"
              >
                <option value="">{t('common.all_member_categories')}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{t(`common.${c.name}`, { defaultValue: c.name })}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => { setFilters(prev => ({ ...prev, status: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })) }}
                className="input"
              >
                <option value="">{t('common.status')}</option>
                <option value="Active">{t('common.active')}</option>
                <option value="Inactive">{t('common.inactive')}</option>
                <option value="Suspended">{t('common.suspended')}</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={filters.paymentStatus}
                onChange={(e) => { setFilters(prev => ({ ...prev, paymentStatus: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })) }}
                className="input"
              >
                <option value="">{t('common.payment_status')}</option>
                <option value="Paid">{t('common.paid')}</option>
                <option value="Unpaid">{t('common.unpaid')}</option>
                <option value="Defaulted">{t('common.defaulted')}</option>
              </select>
              <select
                value={filters.billingMonth}
                onChange={(e) => { setFilters(prev => ({ ...prev, billingMonth: Number(e.target.value) })); setPagination(prev => ({ ...prev, page: 1 })) }}
                className="input"
              >
                {Array.from({ length: 13 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{t(`common.eth_month_${m}`)}</option>
                ))}
              </select>
              <select
                value={filters.billingYear}
                onChange={(e) => { setFilters(prev => ({ ...prev, billingYear: Number(e.target.value) })); setPagination(prev => ({ ...prev, page: 1 })) }}
                className="input"
              >
                {Array.from({ length: 11 }, (_, i) => getCurrentEthiopianPeriod().year - 5 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => { setHasFiltered(true); setPagination(prev => ({ ...prev, page: 1 })); fetchMembers(); }}
                className="btn btn-primary px-6"
              >
                {t('common.display_members')}
              </button>
              <button
                onClick={() => {
                  setSelectedSectorType(''); setSelectedSectorId(''); setSelectedCategoryId('');
                  setFilters({ cluster:'', branch:'', sector:'', membershipType:'', status:'', paymentStatus:'', billingYear: getCurrentEthiopianPeriod().year, billingMonth: getCurrentEthiopianPeriod().month });
                  setSearch(''); setHasFiltered(false); setMembers([]);
                  setSummary({ totalMembers:0, totalMonthlyRevenue:0, totalYearlyRevenue:0 });
                }}
                className="btn btn-secondary px-6"
              >
                {t('common.clear_filters')}
              </button>
            </div>
          </div>
        )}
      </div>

      {!hasFiltered ? (
        <div className="card py-20 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('common.select_filters_to_load')}</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            {t('common.select_filters_instruction')}
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

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-600 dark:bg-blue-700 text-white p-4 rounded-xl shadow-lg mb-4 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">{selectedIds.length} {t('common.members_selected')}</p>
              <p className="text-[10px] text-blue-100 uppercase tracking-widest font-bold">{t('common.manage_multiple_records')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBulkDelete}
              disabled={deletingBulk}
              className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
            >
              {deletingBulk ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {t('common.delete_selected')}
            </button>
            {user?.role === 'admin' && (
              <button 
                onClick={handleBulkDeleteAll}
                disabled={deletingAll}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl shadow-red-900/20"
              >
                {deletingAll ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                {t('common.clear_all')}
              </button>
            )}
            <button 
              onClick={() => setSelectedIds([])}
              className="text-white/70 hover:text-white p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="table-container">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === members.length && members.length > 0} 
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
                <th>{t('common.full_name')}</th>
                <th>{t('common.sex')}</th>
                <th>{selectedSectorType ? t(SECTOR_UNIT_LABELS[selectedSectorType]) : t('common.sector_unit')}</th>
                <th>{t('common.member_category')}</th>
                {/* Dynamic financial columns based on dominant member type */}
                {members.some(m => m.membershipType === 'Salary-Based') && <>
                  <th>{t('common.gross_salary_etb')}</th>
                  <th>{t('common.pension_etb')}</th>
                  <th>{t('common.income_tax_etb')}</th>
                  <th>{t('common.net_salary_etb')}</th>
                  <th>{t('common.contribution_percent')}</th>
                </>}
                {members.some(m => m.membershipType === 'Business') && <th>{t('common.business_type')}</th>}
                {members.some(m => m.membershipType === 'Investor') && <th>{t('common.capital')}</th>}
                <th>{t('common.contribution_in_etb')}</th>
                <th>{t('common.payment_status')}</th>
                <th>{t('common.action')}</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {loading ? (
                <tr>
                  <td colSpan={25} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative flex items-center justify-center">
                        <div className="w-16 h-16 border-2 border-[#FFD700]/10 rounded-full"></div>
                        <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-[#FFD700] border-r-[#D4AF37]/40 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
                        <img src="/pp-logo.png" alt="logo" className="absolute w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#D4AF37]">{t('common.retrieving_records')}</p>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={25} className="text-center py-8 text-gray-500">{t('common.no_members_filter')}</td></tr>
              ) : (
                members.map((member) => (
                  <tr key={member._id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.includes(member._id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(member._id)} 
                        onChange={() => toggleSelectOne(member._id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="font-semibold">{member.fullName}</td>
                    <td>{member.gender === 'Male' ? t('common.male') : member.gender === 'Female' ? t('common.female') : member.gender}</td>
                    <td>{member.branch ? t(`common.${member.branch}`, { defaultValue: member.branch }) : (member.sectorUnit?.name ? t(`common.${member.sectorUnit.name}`, { defaultValue: member.sectorUnit.name }) : '-')}</td>
                    <td><span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-tighter">{member.sector ? t(`common.${member.sector}`, { defaultValue: member.sector }) : (member.memberCategory?.name ? t(`common.${member.memberCategory.name}`, { defaultValue: member.memberCategory.name }) : t(`common.${member.membershipType}`, { defaultValue: member.membershipType }))}</span></td>
                    {members.some(m => m.membershipType === 'Salary-Based') && <>
                      <td>{member.membershipType === 'Salary-Based' ? member.financial.salary.toLocaleString() : '-'}</td>
                      <td className="text-orange-600">{member.membershipType === 'Salary-Based' ? (member.netSalary?.pensionDeduction?.toLocaleString() || 0) : '-'}</td>
                      <td className="text-red-600">{member.membershipType === 'Salary-Based' ? (member.netSalary?.taxDeduction?.toLocaleString() || 0) : '-'}</td>
                      <td className="text-green-600 font-semibold">{member.membershipType === 'Salary-Based' ? (member.netSalary?.netSalary?.toLocaleString() || 0) : '-'}</td>
                      <td>{member.membershipType === 'Salary-Based' ? `${member.contribution.percentage}%` : '-'}</td>
                    </>}
                    {members.some(m => m.membershipType === 'Business') && 
                      <td>{member.membershipType === 'Business' ? (member.financial.businessType || '-') : '-'}</td>
                    }
                    {members.some(m => m.membershipType === 'Investor') && 
                      <td>{member.membershipType === 'Investor' ? (member.financial.capital?.toLocaleString() || 0) : '-'}</td>
                    }
                    <td className="font-semibold">{member.contribution.monthlyFee.toLocaleString()}</td>
                    <td>{getPaymentBadge(member.paymentStatus)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {user?.role !== 'expert' && (
                          <button onClick={() => { setEditingMember(member); setShowMemberModal(true) }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Edit2 className="w-4 h-4" /></button>
                        )}
                        {user?.role !== 'expert' && (
                          <button onClick={() => handleDelete(member._id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {pagination.total === 0
            ? t('common.no_members_found')
            : t('common.showing_records', {
                start: ((pagination.page - 1) * pagination.limit) + 1,
                end: Math.min(pagination.page * pagination.limit, pagination.total),
                total: pagination.total
              })}
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
            className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-50"
          >«</button>
          <button
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            className="btn btn-secondary px-2 py-1 disabled:opacity-50"
          ><ChevronLeft className="w-4 h-4" /></button>

          {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
            // Show pages around current page
            const half = 2
            let start = Math.max(1, pagination.page - half)
            const end = Math.min(pagination.pages, start + 4)
            start = Math.max(1, end - 4)
            return start + i
          }).filter(p => p >= 1 && p <= pagination.pages).map(p => (
            <button
              key={p}
              onClick={() => setPagination(prev => ({ ...prev, page: p }))}
              className={`btn px-3 py-1 text-sm ${
                p === pagination.page
                  ? 'btn-primary'
                  : 'btn-secondary'
              }`}
            >{p}</button>
          ))}

          <button
            disabled={pagination.page === pagination.pages || pagination.pages === 0}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            className="btn btn-secondary px-2 py-1 disabled:opacity-50"
          ><ChevronRight className="w-4 h-4" /></button>
          <button
            disabled={pagination.page === pagination.pages || pagination.pages === 0}
            onClick={() => setPagination(prev => ({ ...prev, page: pagination.pages }))}
            className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-50"
          >»</button>

          <select
            value={pagination.limit}
            onChange={(e) => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
            className="input ml-2 py-1 text-sm w-32"
          >
            {[15, 25, 50, 100].map(n => <option key={n} value={n}>{n} {t('common.per_page')}</option>)}
          </select>
        </div>
      </div>
      </>
      )}

      {/* Member Modal */}
      {showMemberModal && (
        <MemberModal
          member={editingMember as any}
          onClose={() => { setShowMemberModal(false); setEditingMember(null) }}
          onSuccess={() => { setShowMemberModal(false); setEditingMember(null); fetchMembers(true) }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { setShowImportModal(false); setHasFiltered(true); setSelectedSectorType(''); setSelectedSectorId(''); setSelectedCategoryId(''); setPagination(prev => ({ ...prev, page: 1 })); fetchMembers(true) }}
        />
      )}

      {/* Fast Entry Modal */}
      {showFastEntryModal && (
        <FastEntryModal
          onClose={() => setShowFastEntryModal(false)}
          onSuccess={() => { setShowFastEntryModal(false); fetchMembers(true) }}
          sectorTypes={sectorTypes}
          categories={categories}
          userRole={user?.role}
          userSectorUnitId={user?.sectorUnitId}
        />
      )}

      <ConfirmDialog
        open={confirmDelete.open}
        variant="danger"
        title="Delete Member"
        message="This will permanently remove this member and all associated records. This action cannot be undone."
        confirmLabel="Delete Member"
        cancelLabel="Cancel"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        variant="danger"
        title={`Delete ${selectedIds.length} Selected Members`}
        message={`This will permanently delete ${selectedIds.length} selected members and all their associated records. This action cannot be undone.`}
        confirmLabel="Delete Selected"
        cancelLabel="Cancel"
        onConfirm={doBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      <ConfirmDialog
        open={confirmClearAll}
        variant="danger"
        title="Clear All Members"
        message="This will permanently delete ALL members in the system. This is an irreversible administrative action. Please confirm to proceed."
        confirmLabel="Clear All Members"
        cancelLabel="Cancel"
        onConfirm={doClearAll}
        onCancel={() => setConfirmClearAll(false)}
      />
    </motion.div>
  )
}
