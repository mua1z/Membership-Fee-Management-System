import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Mail, Phone, Languages, Shield, Globe, Sun, Moon } from 'lucide-react';
import { getEthiopianYear } from '../utils/ethiopianCalendar';
import LanguageSwitcher from './LanguageSwitcher';
import InstallAppButton from './InstallAppButton';
import PlatformInstallButton from './PlatformInstallButton';

export default function PublicLayout() {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentLang = i18n.language || 'am';

  useEffect(() => {
    // Default to light mode; only use dark if explicitly stored or OS prefers dark
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }

    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const navLinks = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.about'), path: '/about' },
    { name: t('nav.features'), path: '/features' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'News', path: '/news' },
    { name: t('nav.contact'), path: '/contact' }
  ];

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-ebony text-slate-900 dark:text-slate-300 font-sans relative overflow-x-hidden flex flex-col transition-colors duration-500 ${currentLang.startsWith('am') ? 'font-amharic' : ''}`}>
      
      {/* ── Navigation ────────────────────────── */}
      <nav 
        className={`fixed top-0 w-full z-[100] transition-all duration-500 ease-in-out border-b-4 bg-white dark:bg-black border-primary/40 dark:border-gold/40 shadow-lg ${
          scrolled 
          ? 'py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)]' 
          : 'py-3'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-8 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 dark:bg-gold/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-700"></div>
              <img src="/pp-logo.png" alt="Logo" className="w-16 h-16 object-contain relative z-10 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className="hidden sm:block">
              <h3 className="font-black tracking-tighter leading-none text-base text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-gold transition-colors duration-300">{t('common.prosperity_party')}</h3>
              <p className="text-[11px] text-slate-700 dark:text-white/90 font-black uppercase tracking-[0.3em] mt-1 leading-tight">
                Dire Dawa Branch Office<br />Membership Fee App
              </p>
            </div>
          </Link>
          
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map(item => (
              <Link
                key={item.name}
                to={item.path}
                className={`text-xs font-black uppercase tracking-[0.3em] transition-all duration-300 relative group ${
                  location.pathname === item.path
                  ? 'text-primary dark:text-white'
                  : 'text-slate-700 dark:text-white/90 hover:text-primary dark:hover:text-white'
                }`}
              >
                {item.name}
                <span className={`absolute -bottom-2 left-0 h-[2px] bg-primary dark:bg-white transition-all duration-500 ${
                  location.pathname === item.path ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-white/50 transition-all duration-300 bg-white/50 dark:bg-transparent"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <LanguageSwitcher />
            
            <button 
              onClick={() => navigate('/login')} 
              className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-widest rounded-full hover:bg-gold dark:hover:bg-gold hover:text-black dark:hover:text-black transition-all duration-500 shadow-[0_10px_20px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_20px_rgba(255,255,255,0.15)]"
            >
              {t('common.login')}
            </button>
          </div>

          <button className="lg:hidden text-black dark:text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-white dark:bg-ebony z-[90] flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
            <button onClick={toggleTheme} className="absolute top-8 right-8 p-3 rounded-full bg-slate-100 dark:bg-white/10">
              {isDarkMode ? <Sun className="w-6 h-6 dark:text-white" /> : <Moon className="w-6 h-6" />}
            </button>
            {navLinks.map(item => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-black text-black dark:text-white uppercase tracking-widest hover:text-primary dark:hover:text-gold transition-colors"
              >
                {item.name}
              </Link>
            ))}
            <button 
              onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
              className="px-12 py-4 bg-primary dark:bg-gold text-white dark:text-black font-black uppercase tracking-widest rounded-full"
            >
              {t('common.login')}
            </button>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow pt-[76px]">
         <Outlet />
      </main>

      {/* ── Footer ────────────────────────── */}
      <footer className="bg-ebony pt-32 pb-16 border-t border-white/5 relative overflow-hidden transition-colors duration-500">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold/5 blur-[150px] rounded-full pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 mb-24">
            <div className="space-y-10">
              <div className="flex items-center gap-4">
                <img src="/pp-logo.png" alt="Logo" className="w-14 h-14 object-contain" />
                <div>
                  <h3 className="text-white font-black tracking-tighter leading-none text-xl">{t('common.prosperity_party')}</h3>
                  <p className="text-[10px] text-gold font-black uppercase tracking-[0.4em] mt-1">{t('common.app_subtitle')}</p>
                </div>
              </div>
              <p className="text-sm text-white/80 leading-relaxed font-medium max-w-sm">
                {t('landing.footer_desc')}
              </p>
              <div className="flex gap-6">
                {['facebook', 'twitter', 'linkedin', 'instagram'].map(social => (
                  <a key={social} href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:bg-transparent hover:text-gold hover:border-gold transition-all duration-300">
                    <Globe size={18} />
                  </a>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-[0.4em] mb-12 relative inline-block">
                {t('landing.footer_quick_nav')}
                <span className="absolute -bottom-4 left-0 w-8 h-[2px] bg-gold"></span>
              </h4>
              <ul className="space-y-6">
                {[t('nav.home'), t('nav.about'), t('nav.features'), t('nav.dashboard'), t('nav.reports')].map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm text-white/80 hover:text-gold transition-all duration-300 flex items-center gap-2 group font-semibold">
                      <span className="w-0 h-[1px] bg-gold transition-all duration-300 group-hover:w-4"></span>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-[0.4em] mb-12 relative inline-block">
                {t('nav.security')}
                <span className="absolute -bottom-4 left-0 w-8 h-[2px] bg-gold"></span>
              </h4>
              <ul className="space-y-6">
                {[t('landing.footer_privacy'), t('landing.footer_terms'), t('nav.security'), t('landing.trust_integrity'), t('nav.contact')].map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm text-white/80 hover:text-gold transition-all duration-300 flex items-center gap-2 group font-semibold">
                      <span className="w-0 h-[1px] bg-gold transition-all duration-300 group-hover:w-4"></span>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-[0.4em] mb-12 relative inline-block">
                {t('landing.footer_contact')}
                <span className="absolute -bottom-4 left-0 w-8 h-[2px] bg-gold"></span>
              </h4>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Phone size={18} className="text-gold" />
                  </div>
                  <p className="text-sm text-white/80 font-medium">
                    {t('landing.footer_inquiries')}<br />
                    <span className="text-white text-lg font-bold">+251 911 000 000</span>
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Mail size={18} className="text-gold" />
                  </div>
                  <p className="text-sm text-white/80 font-medium">
                    {t('common.email')}<br />
                    <span className="text-white font-bold">support@pp-diredawa.org</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-8 pb-8 border-t border-white/10 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h4 className="text-white font-black text-sm uppercase tracking-[0.3em] mb-2">{t('landing.get_our_app') || 'Get Our App'}</h4>
                <p className="text-[11px] text-white/60">Install for the best experience on any device</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <InstallAppButton />
                <PlatformInstallButton platform="android" />
                <PlatformInstallButton platform="windows" />
                <PlatformInstallButton platform="macos" />
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.4em]">
              &copy; {getEthiopianYear()} Prosperity Party Dire Dawa Branch &bull; Developed by High-End Digital Team
            </p>
            <div className="flex items-center gap-4 text-white/60">
               <Shield size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest">{t('landing.trust_security')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
