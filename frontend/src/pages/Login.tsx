import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { getEthiopianYear } from '../utils/ethiopianCalendar'
import { motion } from 'framer-motion'
import { 
  ArrowRight, ShieldCheck, AlertCircle, Languages,
  TrendingUp, Lock, Mail, Activity, Clock
} from 'lucide-react'

const Preloader = () => {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-gradient-to-br dark:from-[#0a0e1a] dark:via-[#070b14] dark:to-[#0d1117] flex flex-col items-center justify-center gap-10 transition-colors duration-500">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FFD700]/10 dark:bg-[#FFD700]/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring */}
        <div className="absolute w-44 h-44 border border-[#FFD700]/40 dark:border-[#FFD700]/20 rounded-full animate-[ping_3s_ease-in-out_infinite]"></div>
        {/* Middle static ring */}
        <div className="absolute w-36 h-36 border border-[#FFD700]/20 dark:border-[#FFD700]/10 rounded-full"></div>
        {/* Inner spinning ring */}
        <div className="w-28 h-28 border-2 border-[#FFD700]/30 dark:border-[#FFD700]/15 rounded-full"></div>
        <div className="absolute inset-0 w-28 h-28 border-2 border-transparent border-t-[#FFD700] border-r-[#D4AF37]/70 dark:border-r-[#D4AF37]/50 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
        {/* Logo */}
        <img src="/pp-logo.png" alt="PP Logo" className="absolute w-14 h-14 object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.5)] dark:drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
      </div>
      
      <div className="text-center space-y-3 animate-in fade-in duration-1000">
        <h2 className="font-black tracking-[0.4em] uppercase text-xs bg-clip-text text-transparent bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#B8860B] dark:from-[#FFD700] dark:via-[#FFF8DC] dark:to-[#D4AF37]">
          {t('common.prosperity_party')}
        </h2>
        <p className="text-[#B8860B] dark:text-[#FFD700] text-[10px] font-bold uppercase tracking-[0.5em] opacity-80">
          {t('common.initializing_session')}
        </p>
        {/* Gold bar loading indicator */}
        <div className="w-48 h-[2px] bg-slate-200 dark:bg-white/5 rounded-full mx-auto mt-4 overflow-hidden">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent dark:via-[#FFD700] rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"></div>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const navigate = useNavigate()
  const { login } = useAuth()

  const currentLang = i18n.language || 'am'

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.response?.data?.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  if (isInitialLoading) return <Preloader />

  // BEAUTIFUL SPLIT-SCREEN LOGIN VIEW WITH DARK/LIGHT MODE
  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-[#070b14] flex relative overflow-hidden transition-colors duration-500 ${currentLang.startsWith('am') ? 'font-amharic' : 'font-sans'}`}>
      
      {/* Abstract Animated Background Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[150px] pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-all"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-amber-400/20 dark:bg-[#FFD700]/5 rounded-full blur-[150px] pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-all"></div>

      {/* Left Side: Stunning Graphic */}
      <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-12 border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#03050a] transition-colors duration-500">
          <motion.div 
            className="absolute inset-0 overflow-hidden bg-slate-100 dark:bg-transparent"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          >
            <motion.img 
              animate={{ y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
              src="/membership_bg.png" 
              alt="Membership Network" 
              className="w-full h-full object-cover opacity-100 dark:opacity-80 scale-110" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-transparent dark:from-[#03050a] dark:via-transparent dark:to-[#03050a] transition-colors duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-white/20 dark:from-[#03050a] dark:via-transparent dark:to-[#03050a]/50 transition-colors duration-500"></div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, rotateX: 30, y: 50, z: -100 }}
            animate={{ opacity: 1, rotateX: 0, y: 0, z: 0 }}
            transition={{ duration: 1, delay: 0.3, type: "spring", bounce: 0.4 }}
            style={{ perspective: 1000, transformStyle: "preserve-3d" }}
            className="relative z-10 max-w-2xl text-left"
          >

            <motion.h1 
              className="text-5xl xl:text-6xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-6" 
              style={{ transform: "translateZ(30px)" }}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.15, delayChildren: 0.8 }
                }
              }}
            >
              <motion.span 
                className="block mb-2"
                variants={{ hidden: { opacity: 0, y: 50, rotateX: 90 }, visible: { opacity: 1, y: 0, rotateX: 0, transition: { type: "spring", bounce: 0.6 } } }}
              >
                {t('common.login_title_line1')}
              </motion.span>
              <motion.span 
                className="text-black dark:text-[#FFD700] drop-shadow-lg block"
                variants={{ hidden: { opacity: 0, y: 50, rotateX: -90 }, visible: { opacity: 1, y: 0, rotateX: 0, transition: { type: "spring", bounce: 0.6 } } }}
              >
                {t('common.login_title_line2')}
              </motion.span>
            </motion.h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-lg mb-12" style={{ transform: "translateZ(20px)" }}>
              {t('common.login_desc')}
            </p>
          </motion.div>
      </div>

      {/* Right Side: Elegant Glass Form */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-6 relative z-10">
        
        {/* Language Toggler at top right */}
        <div className="absolute top-8 right-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => i18n.changeLanguage(currentLang.startsWith('en') ? 'am' : 'en')}
            className="px-4 py-2 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-black text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-white hover:border-primary/50 dark:hover:border-white/20 transition-all flex items-center gap-2 uppercase tracking-widest backdrop-blur-md shadow-sm"
          >
            <Languages className="w-3 h-3" />
            {currentLang.startsWith('am') ? 'English' : 'አማርኛ'}
          </motion.button>
        </div>

        <motion.div 
          initial={{ opacity: 0, rotateY: -20, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, rotateY: 0, x: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.1, type: "spring", bounce: 0.3 }}
          style={{ perspective: 1000 }}
          className="w-full max-w-md"
        >
          <motion.div 
            whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="bg-white/80 dark:bg-[#0b1221]/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-slate-200/50 dark:border-white/10 p-10 lg:p-12 relative overflow-hidden transition-colors duration-500"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Form Top Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary dark:via-[#FFD700] to-transparent opacity-50"></div>
            
            <div className="text-center mb-10 relative z-10">
              <img src="/pp-logo.png" alt="PP Logo" className="w-16 h-16 mx-auto mb-6 drop-shadow-2xl" />
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2">{t('common.login')}</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.3em]">{t('common.branch_office')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-[11px] font-black uppercase tracking-wider animate-in shake">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[9px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.3em] ml-1">{t('common.email')}</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-primary dark:group-focus-within:text-[#FFD700] transition-colors" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-[#FFD700]/50 focus:border-transparent transition-all font-bold text-sm shadow-inner"
                    placeholder="admin@pp-diredawa.org"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.3em] ml-1">{t('common.password')}</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-primary dark:group-focus-within:text-[#FFD700] transition-colors" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-[#FFD700]/50 focus:border-transparent transition-all font-bold text-sm shadow-inner"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={loading}
                  className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-primary dark:from-[#D4AF37] dark:to-[#FFD700] p-[1px] transition-all hover:shadow-[0_0_40px_rgba(37,99,235,0.3)] dark:hover:shadow-[0_0_40px_rgba(255,215,0,0.3)]"
                >
                  <div className="relative flex items-center justify-center gap-3 bg-primary dark:bg-[#0b1221] group-hover:bg-transparent px-8 py-4 rounded-2xl transition-all duration-300">
                    {loading ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin text-white dark:text-[#FFD700] group-hover:text-white dark:group-hover:text-black" />
                        <span className="text-[11px] font-black text-white dark:text-[#FFD700] group-hover:text-white dark:group-hover:text-black uppercase tracking-[0.2em]">{t('common.loading')}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] font-black text-white dark:text-[#FFD700] group-hover:text-white dark:group-hover:text-black uppercase tracking-[0.2em]">{t('common.enter_dashboard')}</span>
                        <ArrowRight className="w-4 h-4 text-white dark:text-[#FFD700] group-hover:text-white dark:group-hover:text-black transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </div>
                </motion.button>
                
                <button 
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-[9px] font-black text-slate-500 hover:text-slate-800 dark:hover:text-white uppercase tracking-[0.3em] transition-colors mt-2"
                >
                  {t('common.return_to_homepage')}
                </button>
              </div>
            </form>
          </motion.div>
          
          <p className="text-center mt-10 text-slate-500 dark:text-slate-600 text-[8px] font-black uppercase tracking-[0.4em]">
            &copy; {getEthiopianYear()} {t('common.prosperity_party')} &bull; System V2.0
          </p>
        </motion.div>
      </div>
    </div>
  )
}
