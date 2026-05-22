import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useTranslation } from 'react-i18next'
import {
  Users, Plus, Edit2, Trash2, Key, Shield, Building2,
  Search, Loader2, CheckCircle2, AlertCircle, X, Eye, EyeOff, ToggleLeft, ToggleRight
} from 'lucide-react'
import { motion } from 'framer-motion'
import ConfirmDialog from '../components/ConfirmDialog'

interface SectorUnit { id: number; name: string; sectorTypeName?: string }
interface SectorType { id: number; name: string }
interface UserAccount {
  id: number
  username: string
  email: string
  fullName: string
  role: 'admin' | 'sector_officer' | 'expert'
  sectorUnitId: number | null
  isActive: boolean
  profilePic: string | null
  createdAt: string
  assignedSectorUnit?: { id: number; name: string } | null
}

interface Toast { type: 'success' | 'error'; message: string }

const emptyForm = {
  username: '', email: '', fullName: '',
  role: 'sector_officer' as 'admin' | 'sector_officer' | 'expert',
  sectorType: '', sectorUnitId: '', password: '', isActive: true
}

export default function UserManagement() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<UserAccount[]>([])
  const [sectorTypes, setSectorTypes] = useState<SectorType[]>([])
  const [allSectorUnits, setAllSectorUnits] = useState<SectorUnit[]>([])
  const [filteredSectorUnits, setFilteredSectorUnits] = useState<SectorUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)

  const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    sector_officer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    expert: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
  }

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Password reset modal
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState<UserAccount | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  // Confirm delete dialog
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ open: boolean; user: UserAccount | null }>({ open: false, user: null })

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const [usersRes, typesRes, sectorsRes] = await Promise.all([
        api.get('/users'),
        api.get('/sector-types'),
        api.get('/sectors')
      ])
      setUsers(usersRes.data.data)
      setSectorTypes(typesRes.data)
      setAllSectorUnits(sectorsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  // When sector type changes in form, filter units and reset selection
  const handleSectorTypeChange = (typeName: string) => {
    setForm(p => ({ ...p, sectorType: typeName, sectorUnitId: '' }))
    if (typeName) {
      api.get(`/sectors?type=${typeName}`).then(res => setFilteredSectorUnits(res.data)).catch(() => {})
    } else {
      setFilteredSectorUnits([])
    }
  }

  const openCreate = () => {
    setEditingUser(null)
    setForm({ ...emptyForm })
    setFilteredSectorUnits([])
    setShowPassword(false)
    setShowModal(true)
  }

  const openEdit = (u: UserAccount) => {
    setEditingUser(u)
    // Detect sector type from existing unit
    const existingUnit = allSectorUnits.find(s => s.id === u.sectorUnitId)
    const detectedType = existingUnit?.sectorTypeName || ''
    if (detectedType) {
      api.get(`/sectors?type=${detectedType}`).then(res => setFilteredSectorUnits(res.data)).catch(() => {})
    } else {
      setFilteredSectorUnits([])
    }
    setForm({
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      sectorType: detectedType,
      sectorUnitId: u.sectorUnitId ? String(u.sectorUnitId) : '',
      password: '',
      isActive: u.isActive
    })
    setShowPassword(false)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.fullName || !form.email || !form.username) {
      showToast('error', 'Full name, email, and username are required.')
      return
    }
    if (form.role === 'sector_officer' && !form.sectorUnitId) {
      showToast('error', 'Please select a Sector Type and Assigned Sector for the Sector Officer.')
      return
    }
    if (!editingUser && !form.password) {
      showToast('error', 'Password is required for new users.')
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        username: form.username,
        email: form.email,
        fullName: form.fullName,
        role: form.role,
        sectorUnitId: form.sectorUnitId ? Number(form.sectorUnitId) : null,
        isActive: form.isActive
      }
      if (form.password) payload.password = form.password

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload)
        showToast('success', t('common.user_saved'))
      } else {
        await api.post('/users', payload)
        showToast('success', t('common.user_saved'))
      }
      setShowModal(false)
      fetchUsers()
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to save user.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (u: UserAccount) => {
    setConfirmDeleteUser({ open: true, user: u })
  }

  const doDelete = async () => {
    const u = confirmDeleteUser.user
    setConfirmDeleteUser({ open: false, user: null })
    if (!u) return
    try {
      await api.delete(`/users/${u.id}`)
      showToast('success', t('common.user_deleted'))
      fetchUsers()
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to delete user.')
    }
  }

  const handleToggleActive = async (u: UserAccount) => {
    try {
      await api.put(`/users/${u.id}`, { isActive: !u.isActive })
      fetchUsers()
      showToast('success', t('common.user_saved'))
    } catch (err: any) {
      showToast('error', 'Failed to update status.')
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast('error', 'Password must be at least 6 characters.')
      return
    }
    setResettingPassword(true)
    try {
      await api.put(`/users/${passwordTarget!.id}/reset-password`, { newPassword })
      showToast('success', t('common.password_reset_success'))
      setShowPasswordModal(false)
      setNewPassword('')
      setPasswordTarget(null)
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to reset password.')
    } finally {
      setResettingPassword(false)
    }
  }

  const filtered = users.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5 }} 
      className="space-y-6"
    >
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl animate-in slide-in-from-right-4 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('common.users_management')}</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage system user accounts and permissions</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('common.add_user')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('common.total_users'), value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: t('common.admin'), value: users.filter(u => u.role === 'admin').length, icon: Shield, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: t('common.sector_officer'), value: users.filter(u => u.role === 'sector_officer').length, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: t('common.expert'), value: users.filter(u => u.role === 'expert').length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
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


      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            className="input pl-10"
            placeholder="Search users by name, email, or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th>{t('common.user')}</th>
              <th>{t('common.username')}</th>
              <th>{t('common.role')}</th>
              <th>{t('common.assigned_sector')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.joined')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
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
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-500">{t('common.no_results')}</td></tr>
            ) : (
              filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                        {u.profilePic ? (
                          <img src={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}${u.profilePic}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          u.fullName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u.fullName}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm font-mono">@{u.username}</td>
                  <td>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[u.role]}`}>
                      {t(`common.${u.role}`)}
                    </span>
                  </td>
                  <td className="text-sm">{u.assignedSectorUnit?.name || <span className="text-gray-400 italic">{t('common.all_sectors')}</span>}</td>
                  <td>
                    <button onClick={() => handleToggleActive(u)} className="flex items-center gap-1 text-sm">
                      {u.isActive
                        ? <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600 font-medium">{t('common.active')}</span></>
                        : <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-500">{t('common.inactive')}</span></>}
                    </button>
                  </td>
                  <td className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-blue-600"
                        title={t('common.edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setPasswordTarget(u); setNewPassword(''); setShowPasswordModal(true) }}
                        className="p-1.5 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/20 text-yellow-600"
                        title={t('common.reset_password')}
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700 flex-shrink-0">
              <h2 className="text-lg font-semibold">{editingUser ? t('common.edit_user') : t('common.create_new_user')}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('common.full_name')} *</label>
                  <input className="input" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder={t('common.full_name')} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('common.username')} *</label>
                  <input className="input" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder={t('common.username')} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.email')} *</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder={t('common.email')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.role')} *</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={e => {
                    const r = e.target.value as any
                    setForm(p => ({ ...p, role: r, sectorType: '', sectorUnitId: '' }))
                    setFilteredSectorUnits([])
                  }}
                >
                  <option value="admin">{t('common.admin')}</option>
                  <option value="sector_officer">{t('common.sector_officer')}</option>
                  <option value="expert">{t('common.expert')}</option>
                </select>
              </div>

              {/* Cascading Sector Type + Unit — only for Sector Officer */}
              {form.role === 'sector_officer' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('common.sector_type')} *</label>
                    <select
                      className="input"
                      value={form.sectorType}
                      onChange={e => handleSectorTypeChange(e.target.value)}
                    >
                      <option value="">{t('common.select_sector_type')}</option>
                      {sectorTypes.map(st => (
                        <option key={st.id} value={st.name}>
                          {st.name === 'Institution' ? `🏛 ${t('common.government')}`
                            : st.name === 'Rural Cluster' ? `🌾 ${t('common.rural')}`
                            : st.name === 'Urban Woreda' ? `🏙 ${t('common.urban')}`
                            : st.name === 'Secondary School' ? `🎓 ${t('common.secondary_school')}`
                            : st.name === 'Health Institution' ? `🏥 ${t('common.health_institution')}`
                            : st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('common.assigned_sector')} *</label>
                    <select
                      className="input"
                      value={form.sectorUnitId}
                      onChange={e => setForm(p => ({ ...p, sectorUnitId: e.target.value }))}
                      disabled={!form.sectorType}
                    >
                      <option value="">{form.sectorType ? t('common.select_sector_unit') : t('common.select_sector_type')}</option>
                      {filteredSectorUnits.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {editingUser ? t('common.new_password') : t('common.password')} {!editingUser && '*'}
                </label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder={editingUser ? t('common.keep_empty_to_stay') : 'Minimum 6 characters'}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {!editingUser && form.password && form.password.length < 6 && (
                  <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters.</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="isActive" className="text-sm font-medium">{t('common.account_active')}</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t dark:border-gray-700 flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">{t('common.cancel')}</button>
              <button
                onClick={handleSave}
                disabled={saving || (!editingUser && (!form.password || form.password.length < 6))}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? t('common.loading') : editingUser ? t('common.save_changes') : t('common.create_user')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && passwordTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold">{t('common.reset_password')}</h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('common.set_new_password_for')} <strong>{passwordTarget.fullName}</strong> ({passwordTarget.email})
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.new_password')}</label>
                <input
                  className="input"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t dark:border-gray-700">
              <button onClick={() => setShowPasswordModal(false)} className="btn btn-secondary">{t('common.cancel')}</button>
              <button onClick={handleResetPassword} disabled={resettingPassword} className="btn btn-primary flex items-center gap-2">
                {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {t('common.reset_password')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteUser.open}
        variant="danger"
        title="Delete User Account"
        message={`Are you sure you want to delete the account for "${confirmDeleteUser.user?.fullName}"? This action cannot be undone.`}
        confirmLabel="Delete User"
        cancelLabel="Cancel"
        onConfirm={doDelete}
        onCancel={() => setConfirmDeleteUser({ open: false, user: null })}
      />
    </motion.div>
  )
}
