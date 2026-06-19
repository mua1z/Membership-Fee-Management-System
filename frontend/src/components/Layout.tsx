import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Users, Wallet, FileText, LogOut, Menu, Sun, Moon,
  Settings, UserCircle, ShieldCheck, ChevronRight, Languages, Bot, Image
} from 'lucide-react'
import PageLoader from './PageLoader'

export default function Layout() {
  const { user, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    // Default to light mode; only use dark if explicitly stored or OS prefers dark
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    }
  }, [])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const handleLogout = () => {
    setLoggingOut(true)
    setTimeout(() => {
      logout()
    }, 1000)
  }

  const langOrder = ['am', 'en', 'om', 'so']
  const currentLang = i18n.language || 'am'
  const langLabels: Record<string, string> = { en: 'English', am: 'አማርኛ', om: 'Afaan Oromoo', so: 'Soomaali' }

  const toggleLanguage = () => {
    const code = currentLang.startsWith('am') ? 'am' : currentLang.startsWith('om') ? 'om' : currentLang.startsWith('so') ? 'so' : 'en'
    const idx = langOrder.indexOf(code)
    const next = langOrder[(idx + 1) % langOrder.length]
    i18n.changeLanguage(next)
  }

  const navItems = [
    { icon: LayoutDashboard, label: t('common.dashboard'), path: '/dashboard', roles: ['admin', 'sector_officer', 'expert'] },
    { icon: Users,           label: t('common.members'),   path: '/members',   roles: ['admin', 'sector_officer', 'expert'] },
    { icon: Wallet,          label: t('common.payments'),  path: '/payments',  roles: ['admin', 'sector_officer', 'expert'] },
    { icon: FileText,        label: t('common.reports'),   path: '/reports',   roles: ['admin', 'sector_officer', 'expert'] },
    { icon: Bot,             label: 'AI Assistant',        path: '/ai-assistant', roles: ['admin', 'sector_officer', 'expert'] },
    { icon: ShieldCheck,     label: t('common.users'),     path: '/users',     roles: ['admin'] },
    { icon: Settings,        label: t('common.settings'),  path: '/settings',  roles: ['admin'] },
    { icon: Image,           label: 'Content Management',       path: '/settings/news', roles: ['admin'] },
  ].filter(item => item.roles.includes(user?.role || ''))

  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')
  const avatarUrl = user?.profilePic
    ? (user.profilePic.startsWith('http') ? user.profilePic : `${baseUrl}${user.profilePic}`)
    : null

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans ${currentLang.startsWith('am') ? 'font-amharic' : currentLang.startsWith('om') ? '' : ''}`}>
      {loggingOut && (
        <div className="fixed inset-0 z-[100] bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
          <PageLoader message={t('common.processing')} />
        </div>
      )}

      {/* ── Sidebar (Desktop) ───────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen flex flex-col transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-ebony border-r border-white/5 w-60 hidden lg:flex`}
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center pt-8 pb-6 px-4 border-b border-slate-800/50">
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-[var(--gold)] to-amber-500 rounded-full blur-md opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-white p-1.5 rounded-full shadow-2xl w-24 h-24 flex items-center justify-center overflow-hidden ring-4 ring-white/10">
              <img src="/pp-logo.png" alt="Logo" className="w-full h-full object-contain rounded-full" />
            </div>
          </div>
          <div className="mt-3 text-center px-4">
            <h1 className="text-white font-black text-sm leading-tight tracking-tight">{t('common.prosperity_party')}</h1>
            <p className="text-[var(--gold)] text-[8px] font-black uppercase tracking-[0.2em] mt-1.5 leading-relaxed">
              {t('common.app_subtitle')}
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] px-4 mb-3">{t('common.filter')}</p>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-300 group ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dim)] text-white shadow-lg shadow-[var(--gold)]/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <item.icon className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isActive(item.path) ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-bold text-[12px] tracking-wide">{item.label}</span>
              </div>
              {isActive(item.path) && <ChevronRight className="w-3 h-3 opacity-70" />}
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer: User Profile */}
        <div className="p-3 border-t border-white/5 bg-black/20">
          <Link
            to="/profile"
            className={`flex items-center gap-2.5 p-2.5 rounded-lg transition-all duration-300 ${
              isActive('/profile')
                ? 'bg-white/10 ring-1 ring-white/20'
                : 'hover:bg-white/5'
            }`}
          >
            <div className="w-8 h-8 rounded-full border-2 border-[var(--gold)]/30 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden bg-slate-800">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{user?.fullName?.charAt(0)?.toUpperCase() || 'U'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-white truncate leading-none mb-1">{user?.fullName}</p>
              <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider truncate">
                {t(`common.${user?.role || 'expert'}`)}
              </p>
            </div>
          </Link>
        </div>
      </aside>

      {/* ── Main Content Area ───────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 overflow-x-hidden ${sidebarOpen ? 'lg:pl-60' : 'lg:pl-0'}`}>
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:block">
              <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight leading-none">
                {navItems.find(item => isActive(item.path))?.label || t('common.profile')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[10px] font-black text-amber-700 dark:text-amber-400 flex items-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <Languages className="w-4 h-4" />
              {langLabels[currentLang.startsWith('am') ? 'am' : currentLang.startsWith('om') ? 'om' : currentLang.startsWith('so') ? 'so' : 'en']}
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-all font-bold text-[11px] px-3"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.logout')}</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-ebony/95 backdrop-blur-xl border-t border-white/5 px-4 py-2 flex items-center justify-between safe-area-bottom overflow-x-auto no-scrollbar">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-all duration-300 min-w-[60px] ${
              isActive(item.path) ? 'text-[var(--gold)]' : 'text-slate-400'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span className="text-[8px] font-black uppercase tracking-[0.1em]">{item.label}</span>
          </Link>
        ))}
        <Link
          to="/profile"
          className={`flex flex-col items-center gap-1 transition-all duration-300 min-w-[60px] ${
            isActive('/profile') ? 'text-[var(--gold)]' : 'text-slate-400'
          }`}
        >
          <UserCircle className="w-4 h-4" />
          <span className="text-[8px] font-black uppercase tracking-[0.1em]">{t('common.profile')}</span>
        </Link>
      </nav>
    </div>
  )
}

