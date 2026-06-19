import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit3, Trash2, X, Save, Image as ImageIcon, Calendar, Loader2 } from 'lucide-react'
import api from '../lib/api'
import PageLoader from '../components/PageLoader'

interface NewsItem {
  id: number
  title: string
  content: string
  image: string | null
  category: string
  language: string
  isActive: number
  createdBy: number
  createdAt: string
  updatedAt: string
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'am', label: 'Amharic (አማርኛ)' },
  { value: 'om', label: 'Afaan Oromo' },
  { value: 'so', label: 'Af Somali' },
  { value: 'ar', label: 'Arabic (العربية)' }
]

export default function NewsManager({ isComponent = false }: { isComponent?: boolean }) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<NewsItem | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ title: '', content: '', category: 'news', language: 'en' })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => { fetchNews() }, [])

  const fetchNews = async () => {
    setLoading(true)
    try {
      const res = await api.get('/news')
      if (res.data.success) setNews(res.data.data)
    } catch (err: any) {
      showMessage('error', 'Failed to load news')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 4000)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', content: '', category: 'news', language: 'en' })
    setPreviewUrl(null)
    setShowForm(true)
  }

  const openEdit = (item: NewsItem) => {
    setEditing(item)
    setForm({ title: item.title, content: item.content, category: item.category, language: item.language || 'en' })
    setPreviewUrl(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { showMessage('error', 'Title is required'); return }
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', form.title)
      formData.append('content', form.content)
      formData.append('category', form.category)
      formData.append('language', form.language)
      if (fileRef.current?.files?.[0]) {
        formData.append('image', fileRef.current.files[0])
      }

      let res
      if (editing) {
        res = await api.put(`/news/${editing.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        res = await api.post('/news', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      }

      if (res.data.success) {
        showMessage('success', editing ? 'News updated' : 'News created')
        setShowForm(false)
        setEditing(null)
        fetchNews()
      }
    } catch (err: any) {
      showMessage('error', err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this news article? This cannot be undone.')) return
    try {
      const res = await api.delete(`/news/${id}`)
      if (res.data.success) {
        showMessage('success', 'News deleted')
        fetchNews()
      }
    } catch { showMessage('error', 'Delete failed') }
  }

  const handleFileSelect = () => {
    const file = fileRef.current?.files?.[0]
    if (file) setPreviewUrl(URL.createObjectURL(file))
  }

  if (loading) return <PageLoader />

  return (
    <div className={isComponent ? "" : "p-6 max-w-6xl mx-auto"}>
      {!isComponent && (
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage news articles and announcements</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[#0B5D3B] hover:bg-[#094a2f] text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> New Article
          </button>
        </div>
      )}
      {isComponent && (
        <div className="flex justify-end mb-6">
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[#0B5D3B] hover:bg-[#094a2f] text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> New Article
          </button>
        </div>
      )}

      {message.text && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#0B5D3B] shadow-xl rounded-2xl p-6 space-y-5 relative">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit Article' : 'New Article'}</h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/20 outline-none transition-all text-gray-900 dark:text-white shadow-sm font-medium" placeholder="News title" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Content</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} className="w-full px-4 py-3 border-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/20 outline-none transition-all resize-y text-gray-900 dark:text-white shadow-sm font-medium" placeholder="Article content..." />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/20 outline-none transition-all text-gray-900 dark:text-white shadow-sm font-medium">
                  <option value="news">News</option>
                  <option value="announcement">Announcement</option>
                  <option value="event">Event</option>
                  <option value="update">Update</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Language</label>
                <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/20 outline-none transition-all text-gray-900 dark:text-white shadow-sm font-medium">
                  {LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Image</label>
                <div className="flex items-center gap-4">
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#0B5D3B]/10 file:text-[#0B5D3B] hover:file:bg-[#0B5D3B]/20 cursor-pointer border-2 border-dashed border-gray-300 dark:border-slate-600 p-2 rounded-xl bg-gray-50 dark:bg-slate-800 transition-all focus:border-[#0B5D3B]" />
                  {(previewUrl || (editing && editing.image)) && (
                    <img src={previewUrl || editing?.image || ''} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-200 dark:border-slate-700" />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[#0B5D3B] hover:bg-[#094a2f] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editing ? 'Update' : 'Publish'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {news.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No news articles yet</p>
            <p className="text-sm mt-1">Click "New Article" to create the first one.</p>
          </div>
        ) : (
          news.map((item) => (
            <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 shadow-sm rounded-2xl p-5 flex items-start gap-4 group hover:border-[#0B5D3B] hover:shadow-md transition-all">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0B5D3B]/10 text-[#0B5D3B]">{item.category}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">{LANGUAGES.find(l => l.value === item.language)?.label || item.language || 'English'}</span>
                  {!item.isActive && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">Draft</span>}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white truncate">{item.title}</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">{item.content}</p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(item)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Edit">
                  <Edit3 className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
