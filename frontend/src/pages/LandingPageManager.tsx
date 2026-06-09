import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Save, Upload, Trash2, Image as ImageIcon, Edit3, Eye, X, Globe, RefreshCw,
  FileText, CheckCircle, AlertCircle, ArrowUp, ArrowDown, ToggleLeft,
  ToggleRight, Star, LayoutDashboard, Info,
  Sparkles, Copy, Check, Search, Download, ChevronLeft, ChevronRight,
  Filter, SortAsc, SortDesc, Grid3X3, List, Loader2
} from 'lucide-react'
import api from '../lib/api'
import PageLoader from '../components/PageLoader'

interface LandingImage {
  id: number
  title: string
  altText: string
  description: string
  image: string
  thumbnailSmall: string
  thumbnailMedium: string
  category: string
  displayOrder: number
  isActive: boolean
  isFeatured: boolean
  language: string
  fileSize: number
  imageWidth: number
  imageHeight: number
  createdAt: string
}

interface ContentMap {
  [key: string]: string
}

const IMAGE_CATEGORIES = [
  { value: 'hero', label: 'Hero Banner', icon: LayoutDashboard, desc: 'Full-screen hero background image' },
  { value: 'office_building', label: 'Office Building', icon: LayoutDashboard, desc: 'Building exterior/interior photographs' },
  { value: 'leadership', label: 'Leadership', icon: Star, desc: 'Leadership/executive office photograph' },
  { value: 'events', label: 'Events', icon: Sparkles, desc: 'Special events and ceremonies' },
  { value: 'community', label: 'Community Activities', icon: ImageIcon, desc: 'Community engagement and outreach' },
  { value: 'meetings', label: 'Meetings', icon: ImageIcon, desc: 'Staff and board meetings' },
  { value: 'training', label: 'Training Programs', icon: ImageIcon, desc: 'Capacity building and training' },
  { value: 'projects', label: 'Projects', icon: ImageIcon, desc: 'Development projects and initiatives' },
  { value: 'announcements', label: 'Announcements', icon: ImageIcon, desc: 'Official announcements and notices' },
  { value: 'gallery', label: 'Gallery', icon: ImageIcon, desc: 'General gallery photos' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'am', label: 'አማርኛ' },
  { value: 'om', label: 'Afaan Oromoo' },
  { value: 'so', label: 'Soomaali' },
]

const contentFields = [
  { key: 'hero_title', label: 'Hero Title', type: 'text' },
  { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'text' },
  { key: 'hero_description', label: 'Hero Description', type: 'textarea' },
  { key: 'about_title', label: 'About Title', type: 'text' },
  { key: 'about_description', label: 'About Description', type: 'textarea' },
  { key: 'mission_text', label: 'Mission Text', type: 'textarea' },
  { key: 'vision_text', label: 'Vision Text', type: 'textarea' },
  { key: 'leadership_message', label: 'Leadership Message', type: 'textarea' },
  { key: 'leadership_executive_name', label: 'Leadership Executive Name', type: 'text' },
  { key: 'leadership_executive_role', label: 'Leadership Executive Role', type: 'text' },
  { key: 'ai_section_title', label: 'AI Section Title', type: 'text' },
  { key: 'ai_section_description', label: 'AI Section Description', type: 'textarea' },
  { key: 'stats_section_title', label: 'Stats Section Title', type: 'text' },
  { key: 'cta_title', label: 'CTA Title', type: 'text' },
  { key: 'cta_subtitle', label: 'CTA Subtitle', type: 'text' },
  { key: 'cta_description', label: 'CTA Description', type: 'textarea' },
  { key: 'footer_description', label: 'Footer Description', type: 'textarea' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'map_embed_url', label: 'Google Maps Embed URL (Iframe src)', type: 'textarea' },
  { key: 'office_email', label: 'Office Email', type: 'text' },
  { key: 'office_postal_code', label: 'Postal Code', type: 'text' },
  { key: 'office_hours', label: 'Office Hours', type: 'text' },
  { key: 'contact_whatsapp', label: 'WhatsApp Number', type: 'text' },
  { key: 'facebook_url', label: 'Facebook URL', type: 'text' },
  { key: 'telegram_url', label: 'Telegram URL', type: 'text' },
  { key: 'youtube_url', label: 'YouTube URL', type: 'text' },
  { key: 'chairperson_name', label: 'Chairperson Name', type: 'text' },
  { key: 'chairperson_message', label: 'Chairperson Message', type: 'textarea' },
  { key: 'hero_button_text', label: 'Hero Button Text', type: 'text' },
  { key: 'hero_button_link', label: 'Hero Button Link', type: 'text' },
  { key: 'hero_background_image', label: 'Hero Background Image URL', type: 'text' },
  { key: 'privacy_policy_url', label: 'Privacy Policy URL', type: 'text' },
  { key: 'terms_of_service_url', label: 'Terms of Service URL', type: 'text' },
  { key: 'copyright_text', label: 'Copyright Text', type: 'text' },
]

const inferFieldType = (val: string | undefined): 'text' | 'textarea' => {
  if (!val) return 'text'
  return val.length > 100 || val.includes('\n') ? 'textarea' : 'text'
}

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '') || ''

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function LandingPageManager() {
  const [images, setImages] = useState<LandingImage[]>([])
  const [content, setContent] = useState<ContentMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [activeTab, setActiveTab] = useState('images')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadForm, setUploadForm] = useState({ title: '', altText: '', description: '', category: 'gallery', isFeatured: false, language: 'en' })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewModal, setPreviewModal] = useState<LandingImage | null>(null)
  const [editContent, setEditContent] = useState<ContentMap>({})
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [editingImage, setEditingImage] = useState<LandingImage | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (searchQuery) params.set('search', searchQuery)
      params.set('sort', sortOrder)
      params.set('limit', '100')

      const [contentRes, imagesRes] = await Promise.all([
        api.get('/landing/content'),
        api.get(`/landing/admin/images?${params.toString()}`)
      ])
      if (import.meta.env.DEV) {
        console.log('[LandingPageManager] content API response:', contentRes.data)
      }
      if (contentRes.data.success) {
        setContent(contentRes.data.data.content || {})
        setEditContent(contentRes.data.data.content || {})
      }
      if (imagesRes.data.success) setImages(imagesRes.data.data)
    } catch (err: any) {
      console.error('[LandingPageManager] fetch error:', err)
      showMessage('error', err?.response?.data?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const debouncedFetch = useCallback(() => {
    const timer = setTimeout(fetchData, 300)
    return () => clearTimeout(timer)
  }, [categoryFilter, searchQuery, sortOrder])

  useEffect(() => {
    const cleanup = debouncedFetch()
    return cleanup
  }, [categoryFilter, searchQuery, sortOrder])

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  const handleUpload = async () => {
    if (!fileRef.current?.files?.length) {
      showMessage('error', 'Please select an image file')
      return
    }
    setUploading(true)
    setUploadProgress(0)
    try {
      const formData = new FormData()
      formData.append('image', fileRef.current.files[0])
      formData.append('title', uploadForm.title)
      formData.append('altText', uploadForm.altText)
      formData.append('description', uploadForm.description)
      formData.append('category', uploadForm.category)
      formData.append('isFeatured', String(uploadForm.isFeatured))
      formData.append('language', uploadForm.language)

      const res = await api.post('/landing/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
          }
        }
      })
      if (res.data.success) {
        showMessage('success', 'Image uploaded successfully')
        setUploadForm({ title: '', altText: '', description: '', category: 'gallery', isFeatured: false, language: 'en' })
        if (fileRef.current) fileRef.current.value = ''
        setPreviewUrl(null)
        fetchData()
      }
    } catch (err: any) {
      showMessage('error', err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteImage = async (id: number) => {
    if (!confirm('Delete this image? This cannot be undone.')) return
    try {
      const res = await api.delete(`/landing/images/${id}`)
      if (res.data.success) {
        showMessage('success', 'Image deleted')
        setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s })
        fetchData()
      }
    } catch (err) {
      showMessage('error', 'Delete failed')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected image(s)? This cannot be undone.`)) return
    try {
      const res = await api.post('/landing/images/bulk-delete', { ids: Array.from(selectedIds) })
      if (res.data.success) {
        showMessage('success', `${selectedIds.size} image(s) deleted`)
        setSelectedIds(new Set())
        fetchData()
      }
    } catch (err) {
      showMessage('error', 'Bulk delete failed')
    }
  }

  const handleSaveContent = async () => {
    setSaving(true)
    try {
      const res = await api.put('/landing/content', { updates: editContent })
      if (res.data.success) {
        setContent(res.data.data)
        showMessage('success', 'Content updated successfully. Changes are live.')
      }
    } catch (err: any) {
      showMessage('error', err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleFileSelect = () => {
    const file = fileRef.current?.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const toggleActive = async (img: LandingImage) => {
    try {
      await api.put(`/landing/images/${img.id}`, { isActive: !img.isActive })
      showMessage('success', `Image ${img.isActive ? 'deactivated' : 'activated'}`)
      fetchData()
    } catch {
      showMessage('error', 'Update failed')
    }
  }

  const toggleFeatured = async (img: LandingImage) => {
    try {
      await api.put(`/landing/images/${img.id}`, { isFeatured: !img.isFeatured })
      showMessage('success', `Image ${img.isFeatured ? 'removed from' : 'set as'} featured`)
      fetchData()
    } catch {
      showMessage('error', 'Update failed')
    }
  }

  const copyImageUrl = (url: string, id: number) => {
    navigator.clipboard.writeText(BASE_URL + url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const downloadImage = async (img: LandingImage) => {
    try {
      const response = await fetch(BASE_URL + img.image)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = img.title || 'image'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showMessage('error', 'Download failed')
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredImages.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredImages.map(i => i.id)))
    }
  }

  const handleUpdateImageMeta = async () => {
    if (!editingImage) return
    try {
      await api.put(`/landing/images/${editingImage.id}`, {
        title: editingImage.title,
        altText: editingImage.altText,
        description: editingImage.description,
        category: editingImage.category,
        isFeatured: editingImage.isFeatured,
        language: editingImage.language,
      })
      showMessage('success', 'Image metadata updated')
      setEditingImage(null)
      fetchData()
    } catch {
      showMessage('error', 'Update failed')
    }
  }

  if (loading) return <PageLoader />

  const filteredImages = images

  const tabs = [
    { id: 'images', label: 'Image Gallery', icon: ImageIcon },
    { id: 'upload', label: 'Upload Image', icon: Upload },
    { id: 'content', label: 'Edit Content', icon: Edit3 },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-outfit">Landing Page Manager</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Manage images, gallery, content, and site statistics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" target="_blank" rel="noreferrer"
            className="btn btn-secondary flex items-center gap-2 text-xs">
            <Eye className="w-4 h-4" />
            View Live Site
          </a>
          <button onClick={fetchData} className="btn btn-ghost flex items-center gap-2 text-xs">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className={`p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm">{message.text}</span>
            <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto">
              <X className="w-4 h-4 opacity-50 hover:opacity-100" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="card">
        {/* ── TAB: IMAGE GALLERY ─────────────────────── */}
        {activeTab === 'images' && (
          <div>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-outfit">All Images ({images.length})</h2>
                {selectedIds.size > 0 && (
                  <button onClick={handleBulkDelete}
                    className="btn bg-red-500 text-white hover:bg-red-600 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete ({selectedIds.size})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search images..."
                    className="input pl-9 py-1.5 text-xs w-48" />
                </div>
                {/* Sort */}
                <button onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')}
                  className="btn btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg">
                  {sortOrder === 'newest' ? <SortDesc className="w-3.5 h-3.5" /> : <SortAsc className="w-3.5 h-3.5" />}
                  {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                </button>
                {/* View toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                  <button onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}>
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}>
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Category filter chips */}
            <div className="flex gap-1 flex-wrap mb-6 bg-gray-50 dark:bg-gray-900 rounded-xl p-2">
              <button onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}>
                All
              </button>
              {IMAGE_CATEGORIES.map(cat => (
                <button key={cat.value} onClick={() => setCategoryFilter(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    categoryFilter === cat.value
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}>
                  <cat.icon className="w-3 h-3" />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Image grid/list */}
            {filteredImages.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="font-medium">No images found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchQuery ? 'Try a different search term' : 'Upload your first image to get started'}
                </p>
                {!searchQuery && (
                  <button onClick={() => setActiveTab('upload')}
                    className="btn btn-primary mt-4 inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredImages.map(img => (
                  <motion.div
                    key={img.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`group relative bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden border transition-all duration-300 ${
                      selectedIds.has(img.id) ? 'ring-2 ring-primary border-primary' : ''
                    } ${img.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-red-200 dark:border-red-900/30 opacity-70'}`}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={img.thumbnailMedium || img.image}
                        alt={img.altText || img.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                        onClick={() => setPreviewModal(img)}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => toggleSelect(img.id)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-lg ${
                            selectedIds.has(img.id)
                              ? 'bg-primary text-white'
                              : 'bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-primary hover:text-white'
                          }`}>
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {img.isFeatured && (
                        <div className="absolute top-2 left-2 bg-amber-500 text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                          <Star className="w-3 h-3 fill-current" />
                          Featured
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate font-outfit cursor-pointer"
                            onClick={() => setPreviewModal(img)}>
                            {img.title || 'Untitled'}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full ${
                              img.isActive
                                ? 'bg-primary/10 text-primary'
                                : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {img.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-[9px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                              {IMAGE_CATEGORIES.find(c => c.value === img.category)?.label || img.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <button onClick={() => setEditingImage(img)}
                          className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-gray-500 hover:text-primary font-bold transition-colors">
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                        <button onClick={() => toggleFeatured(img)}
                          className={`flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold transition-colors ${
                            img.isFeatured ? 'text-amber-500' : 'text-gray-500 hover:text-amber-500'
                          }`}>
                          <Star className={`w-3 h-3 ${img.isFeatured ? 'fill-current' : ''}`} />
                          {img.isFeatured ? 'Featured' : 'Feature'}
                        </button>
                        <button onClick={() => toggleActive(img)}
                          className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-gray-500 hover:text-primary font-bold transition-colors">
                          {img.isActive ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                          {img.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* List view */
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <div className="w-5">
                    <input type="checkbox" checked={selectedIds.size === filteredImages.length && filteredImages.length > 0}
                      onChange={toggleSelectAll} className="rounded" />
                  </div>
                  <div className="w-12" />
                  <div className="flex-1">Title</div>
                  <div className="w-24">Category</div>
                  <div className="w-20">Status</div>
                  <div className="w-20">Size</div>
                  <div className="w-32">Actions</div>
                </div>
                {filteredImages.map(img => (
                  <div key={img.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      selectedIds.has(img.id) ? 'bg-primary/5 ring-1 ring-primary' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}>
                    <div className="w-5">
                      <input type="checkbox" checked={selectedIds.has(img.id)}
                        onChange={() => toggleSelect(img.id)} className="rounded" />
                    </div>
                    <div className="w-12 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                      <img src={img.thumbnailSmall || img.image} alt={img.altText || img.title}
                        className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewModal(img)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{img.title || 'Untitled'}</p>
                      {img.altText && <p className="text-[10px] text-gray-400 truncate">{img.altText}</p>}
                    </div>
                    <div className="w-24 text-xs text-gray-500">{IMAGE_CATEGORIES.find(c => c.value === img.category)?.label || img.category}</div>
                    <div className="w-20">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        img.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {img.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="w-20 text-xs text-gray-400">{formatFileSize(img.fileSize)}</div>
                    <div className="w-32 flex items-center gap-1">
                      <button onClick={() => setPreviewModal(img)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors" title="Preview">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingImage(img)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors" title="Edit">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => copyImageUrl(img.image, img.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors" title="Copy URL">
                        {copiedId === img.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => downloadImage(img)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors" title="Download">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleFeatured(img)}
                        className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          img.isFeatured ? 'text-amber-500' : 'text-gray-500 hover:text-amber-500'
                        }`} title={img.isFeatured ? 'Unfeature' : 'Feature'}>
                        <Star className={`w-3.5 h-3.5 ${img.isFeatured ? 'fill-current' : ''}`} />
                      </button>
                      <button onClick={() => handleDeleteImage(img.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: UPLOAD ──────────────────────────────── */}
        {activeTab === 'upload' && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold font-outfit">Upload New Image</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Images are automatically optimized and thumbnails generated. Supported: JPG, PNG, WEBP (max 10MB)
              </p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Select Image</label>
                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
                    previewUrl
                      ? 'border-primary/50 bg-primary/[0.02]'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary/50 hover:bg-primary/[0.02]'
                  }`}
                  onClick={() => fileRef.current?.click()}
                >
                  {previewUrl ? (
                    <div className="space-y-3">
                      <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-xl shadow-lg" />
                      <p className="text-xs text-gray-400">Click to change image</p>
                    </div>
                  ) : (
                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Click to select an image</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — Max 10MB</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input type="text" value={uploadForm.title}
                    onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                    className="input" placeholder="e.g. Main Building, Entrance Gate" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select value={uploadForm.category}
                    onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}
                    className="input">
                    {IMAGE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label} — {cat.desc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Alt Text (SEO)</label>
                  <input type="text" value={uploadForm.altText}
                    onChange={e => setUploadForm(f => ({ ...f, altText: e.target.value }))}
                    className="input" placeholder="Descriptive text for accessibility" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Language</label>
                  <select value={uploadForm.language}
                    onChange={e => setUploadForm(f => ({ ...f, language: e.target.value }))}
                    className="input">
                    {LANGUAGES.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={uploadForm.isFeatured}
                    onChange={e => setUploadForm(f => ({ ...f, isFeatured: e.target.checked }))}
                    className="rounded text-amber-500 focus:ring-amber-500" />
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    Set as featured (hero banner)
                  </span>
                </label>
              </div>

              {uploadForm.category && (
                <div className={`p-3 rounded-lg text-xs ${
                  IMAGE_CATEGORIES.find(c => c.value === uploadForm.category)?.value === 'hero'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                }`}>
                  <strong>Usage:</strong> {IMAGE_CATEGORIES.find(c => c.value === uploadForm.category)?.desc || ''}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={uploadForm.description}
                  onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                  className="input" rows={3} placeholder="Optional description of the image" />
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading... {uploadProgress}%
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <button onClick={handleUpload} disabled={uploading || !previewUrl}
                className={`btn flex items-center gap-2 w-full justify-center py-3 ${
                  uploading || !previewUrl ? 'btn-secondary cursor-not-allowed' : 'btn-primary'
                }`}>
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload Image</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: CONTENT ─────────────────────────────── */}
        {activeTab === 'content' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold font-outfit">Edit Landing Page Content</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Changes are published immediately — no save button needed for instant preview
                </p>
              </div>
              <button onClick={handleSaveContent} disabled={saving}
                className="btn btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const knownKeys = new Set(contentFields.map(f => f.key))
                const extraKeys = Object.keys(editContent).filter(k => !knownKeys.has(k))
                const allFields = [
                  ...contentFields,
                  ...extraKeys.map(k => ({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), type: inferFieldType(editContent[k]) }))
                ]
                return allFields.map(field => (
                  <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium mb-1">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea value={editContent[field.key] || ''}
                        onChange={e => setEditContent(f => ({ ...f, [field.key]: e.target.value }))}
                        className="input" rows={4} placeholder={`Enter ${field.label.toLowerCase()}...`} />
                    ) : (
                      <input type="text" value={editContent[field.key] || ''}
                        onChange={e => setEditContent(f => ({ ...f, [field.key]: e.target.value }))}
                        className="input" placeholder={`Enter ${field.label.toLowerCase()}...`} />
                    )}
                  </div>
                ))
              })()}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={handleSaveContent} disabled={saving}
                className="btn btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setPreviewModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative">
                <img src={previewModal.image} alt={previewModal.altText || previewModal.title}
                  className="w-full max-h-[60vh] object-contain bg-gray-100 dark:bg-gray-800" />
                <button onClick={() => setPreviewModal(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                {previewModal.isFeatured && (
                  <div className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Featured
                  </div>
                )}
              </div>
              <div className="p-6 space-y-3">
                <h3 className="text-lg font-bold font-outfit">{previewModal.title || 'Untitled'}</h3>
                {previewModal.altText && <p className="text-xs text-gray-500"><strong>Alt:</strong> {previewModal.altText}</p>}
                {previewModal.description && <p className="text-sm text-gray-600 dark:text-gray-400">{previewModal.description}</p>}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span>Category: {IMAGE_CATEGORIES.find(c => c.value === previewModal.category)?.label || previewModal.category}</span>
                  {previewModal.imageWidth && <span>{previewModal.imageWidth} × {previewModal.imageHeight}px</span>}
                  {previewModal.fileSize && <span>{formatFileSize(previewModal.fileSize)}</span>}
                  <span>Language: {LANGUAGES.find(l => l.value === previewModal.language)?.label || previewModal.language}</span>
                  <span>Status: {previewModal.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => downloadImage(previewModal)}
                    className="btn btn-secondary flex items-center gap-1.5 text-xs px-4 py-2">
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                  <button onClick={() => { copyImageUrl(previewModal.image, previewModal.id) }}
                    className="btn btn-secondary flex items-center gap-1.5 text-xs px-4 py-2">
                    {copiedId === previewModal.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy URL
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Image Metadata Modal */}
      <AnimatePresence>
        {editingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditingImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold font-outfit">Edit Image</h3>
                <button onClick={() => setEditingImage(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input type="text" value={editingImage.title}
                    onChange={e => setEditingImage(f => ({ ...f, title: e.target.value }))}
                    className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Alt Text</label>
                  <input type="text" value={editingImage.altText}
                    onChange={e => setEditingImage(f => ({ ...f, altText: e.target.value }))}
                    className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea value={editingImage.description}
                    onChange={e => setEditingImage(f => ({ ...f, description: e.target.value }))}
                    className="input" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select value={editingImage.category}
                      onChange={e => setEditingImage(f => ({ ...f, category: e.target.value }))}
                      className="input">
                      {IMAGE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Language</label>
                    <select value={editingImage.language}
                      onChange={e => setEditingImage(f => ({ ...f, language: e.target.value }))}
                      className="input">
                      {LANGUAGES.map(l => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingImage.isFeatured}
                    onChange={e => setEditingImage(f => ({ ...f, isFeatured: e.target.checked }))}
                    className="rounded text-amber-500 focus:ring-amber-500" />
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    Featured image
                  </span>
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setEditingImage(null)}
                  className="btn btn-secondary px-4 py-2 text-sm">Cancel</button>
                <button onClick={handleUpdateImageMeta}
                  className="btn btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Panel */}
      <div className="bg-gradient-to-r from-primary/5 to-gold/5 border border-primary/10 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <Globe className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1 font-outfit">Live Publishing</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All changes are published immediately — no deployment or rebuild required.
              Visit the <a href="/" target="_blank" className="font-bold text-primary hover:underline">live landing page</a> to see your updates in real-time.
              Statistics are fetched directly from the database and reflect current data.
            </p>
            <div className="flex flex-wrap gap-6 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Live Updates
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Auto-published
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                No Code Required
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
