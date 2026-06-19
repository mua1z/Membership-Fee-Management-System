import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useTranslation } from 'react-i18next'
import { X, Upload, Download } from 'lucide-react'
import { useToast } from './Toast'

interface ImportModalProps {
  onClose: () => void
  onSuccess: () => void
  userRole?: string
  userSectorUnitId?: number
}

export default function ImportModal({ onClose, onSuccess, userRole, userSectorUnitId }: ImportModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const [sectorTypes, setSectorTypes] = useState<any[]>([])
  const [sectors, setSectors] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  const [selectedSectorType, setSelectedSectorType] = useState('')
  const [selectedSectorId, setSelectedSectorId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  useEffect(() => {
    api.get('/sector-types').then(res => setSectorTypes(res.data)).catch(() => {})
    if (userRole === 'sector_officer' && userSectorUnitId) {
      setSelectedSectorId(String(userSectorUnitId));
    }
  }, [userRole, userSectorUnitId])

  useEffect(() => {
    if (selectedSectorType) {
      api.get(`/sectors?type=${selectedSectorType}`).then(res => setSectors(res.data)).catch(() => {})
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError(t('common.please_select_file'))
      toast.warning('No File Selected', 'Please select an Excel or CSV file before importing.')
      return
    }

    setLoading(true)
    setError('')
    const toastId = toast.loading('Importing Members...', `Processing ${file.name}. This may take a moment for large files.`)

    const formData = new FormData()
    formData.append('file', file)
    if (selectedSectorId) formData.append('sectorUnitId', selectedSectorId)
    if (selectedCategoryId) formData.append('memberCategoryId', selectedCategoryId)

    try {
      const res = await api.post('/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      setResult(res.data.data)
      const { success, errors, duplicates } = res.data.data
      if (success > 0) {
        const skipped = (errors?.length || 0) + (duplicates?.length || 0)
        toast.update(
          toastId, 'success',
          `Import Complete — ${success} Members Added`,
          skipped > 0
            ? `${success} members imported successfully. ${skipped} records were skipped (duplicates or errors).`
            : `All ${success} members have been successfully imported and their contribution fees calculated.`
        )
        onSuccess()
      } else {
        toast.update(toastId, 'error', 'Import Failed', 'No members were imported. Please check the file format and try again.')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || t('common.error')
      setError(msg)
      toast.update(toastId, 'error', 'Import Failed', msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/import/template')
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet(res.data.sampleData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Template')
      XLSX.writeFile(wb, 'PP-Dire-Dawa-Import-Template.xlsx')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t('common.import_members_excel')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Upload File */}
          <div>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="btn btn-primary cursor-pointer inline-flex items-center gap-2"
              >
                {t('common.select_file')}
              </label>
              {file && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('common.selected')}: {file.name}
                </p>
              )}
            </div>
          </div>

          {/* Optional Default Sector Mapping */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-medium mb-3">Apply to all imported members</p>
            {userRole === 'sector_officer' ? (
              <div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300 mb-3">
                  {t('common.your_sector_auto_assigned')}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">{t('common.category')}</label>
                  <select
                    className="input py-1.5 text-sm"
                    value={selectedCategoryId}
                    onChange={e => setSelectedCategoryId(e.target.value)}
                  >
                    <option value="">{t('common.search')}...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{t(`common.${c.name}`, { defaultValue: c.name })}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">{t('common.sector_type')}</label>
                  <select
                    className="input py-1.5 text-sm"
                    value={selectedSectorType}
                    onChange={e => {
                      setSelectedSectorType(e.target.value)
                      setSelectedSectorId('')
                      setSelectedCategoryId('')
                    }}
                  >
                    <option value="">{t('common.search')}...</option>
                    {sectorTypes.map(t_obj => <option key={t_obj.id} value={t_obj.name}>{t_obj.name === 'Institution' ? t('common.institution') : t_obj.name === 'Rural Cluster' ? t('common.rural') : t_obj.name === 'Urban Woreda' ? t('common.urban') : t_obj.name === 'Secondary School' ? t('common.secondary_school') : t_obj.name === 'Health Institution' ? t('common.health_institution') : t_obj.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">{t('common.sector_unit')}</label>
                  <select
                    className="input py-1.5 text-sm"
                    value={selectedSectorId}
                    onChange={e => {
                      setSelectedSectorId(e.target.value)
                      setSelectedCategoryId('')
                    }}
                    disabled={!selectedSectorType}
                  >
                    <option value="">{t('common.search')}...</option>
                    {sectors.map(s => <option key={s.id} value={s.id}>{t(`common.${s.name}`, { defaultValue: s.name })}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">{t('common.category')}</label>
                  <select
                    className="input py-1.5 text-sm"
                    value={selectedCategoryId}
                    onChange={e => setSelectedCategoryId(e.target.value)}
                    disabled={!selectedSectorId}
                  >
                    <option value="">{t('common.search')}...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{t(`common.${c.name}`, { defaultValue: c.name })}</option>)}
                  </select>
                </div>
              </div>
            )}
            <p className="mt-2 text-[10px] text-slate-500">
              If selected, the system will ignore the Excel column and assign these to ALL members in this file.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Import Result */}
          {result && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">{t('common.result')}</p>
              <p className="text-sm">✅ {t('common.import_success')}: {result.success} {t('common.members')}</p>
              {result.errors?.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-red-600 dark:text-red-400">❌ {t('common.error')}: {result.errors.length}</p>
                  <ul className="text-xs mt-1 space-y-1">
                    {result.errors.slice(0, 5).map((err: any, i: number) => (
                      <li key={i}>Row {err.row}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.duplicates?.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    ⚠️ {t('common.duplicates_found')}: {result.duplicates.length}
                  </p>
                  <p className="text-[10px] text-amber-500 mb-1">The following phone numbers already exist in the system:</p>
                  <ul className="text-xs bg-amber-50/50 dark:bg-amber-900/10 p-2 rounded border border-amber-100 dark:border-amber-900/30 max-h-32 overflow-y-auto custom-scrollbar">
                    {result.duplicates.map((dup: any, i: number) => (
                      <li key={i} className="flex justify-between py-0.5 border-b border-amber-100/50 last:border-0">
                        <span>{dup.name}</span>
                        <span className="font-mono text-amber-700 dark:text-amber-300">{dup.phone}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}



          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {t('common.close')}
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="btn btn-primary disabled:opacity-50"
            >
              {loading ? t('common.uploading') : t('common.upload_and_import')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

