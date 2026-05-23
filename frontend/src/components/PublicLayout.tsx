import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Mail, Phone, Languages, Shield, Globe, Sun, Moon } from 'lucide-react';
import { getEthiopianYear } from '../utils/ethiopianCalendar';

export default function PublicLayout() {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const currentLang = i18n.language || 'am';
  const toggleLanguage = () => {
    const newLang = currentLang.startsWith('en') ? 'am' : 'en';
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    // Check initial dark mode state
    if (localStorage.getItem('theme') === 'light' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: light)').matches)) {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
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
    { name: 'Home', path: '/' },
    { name: 'About', path: '/#about' },
    { name: 'Features', path: '/#features' },
    { name: 'Membership', path: '/#membership' },
    { name: 'Reports', path: '/#reports' },
    { name: 'Contact', path: '/contact' }
  ];

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-ebony text-slate-900 dark:text-slate-300 font-sans relative overflow-x-hidden flex flex-col transition-colors duration-500 ${currentLang.startsWith('am') ? 'font-amharic' : ''}`}>
      
      {/* ── Navigation ────────────────────────── */}
      <nav 
        className={`fixed top-0 w-full z-[100] transition-all duration-500 ease-in-out border-b bg-white dark:bg-[#05070a] border-slate-200 dark:border-white/10 ${
          scrolled 
          ? 'py-3 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]' 
          : 'py-6'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-8 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-4 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 dark:bg-gold/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-700"></div>
              <img src="/pp-logo.png" alt="Logo" className="w-12 h-12 object-contain relative z-10 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className="hidden sm:block">
              <h3 className="font-black tracking-tighter leading-none text-lg text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-gold transition-colors duration-300">{t('common.prosperity_party')}</h3>
              <p className="text-[10px] text-slate-500 dark:text-white/80 font-bold uppercase tracking-[0.4em] mt-1">{t('common.app_subtitle')}</p>
            </div>
          </Link>
          
          <div className="hidden lg:flex items-center gap-12">
            {navLinks.map(item => (
              <a 
                key={item.name} 
                href={item.path} 
                className={`text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-300 relative group ${
                  location.pathname === item.path || location.hash === item.path.split('#')[1] 
                  ? 'text-primary dark:text-white' 
                  : 'text-slate-500 dark:text-white/70 hover:text-primary dark:hover:text-white'
                }`}
              >
                {item.name}
                <span className={`absolute -bottom-2 left-0 h-[2px] bg-primary dark:bg-white transition-all duration-500 ${
                  location.pathname === item.path ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-white/50 transition-all duration-300 bg-white/50 dark:bg-transparent"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleLanguage}
              className="p-2 rounded-full border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-white/50 transition-all duration-300 bg-white/50 dark:bg-transparent"
              title="Toggle Language"
            >
              <Globe className="w-5 h-5" />
            </button>
            
            <button 
              onClick={() => navigate('/login')} 
              className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-[11px] uppercase tracking-widest rounded-full hover:bg-gold dark:hover:bg-gold hover:text-slate-900 dark:hover:text-slate-900 transition-all duration-500 shadow-[0_10px_20px_rgba(15,23,42,0.2)] dark:shadow-[0_10px_20px_rgba(255,255,255,0.15)]"
            >
              {t('common.login')}
            </button>
          </div>

          <button className="lg:hidden text-slate-900 dark:text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
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
              <a 
                key={item.name} 
                href={item.path} 
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-widest hover:text-primary dark:hover:text-gold transition-colors"
              >
                {item.name}
              </a>
            ))}
            <button 
              onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
              className="px-12 py-4 bg-primary dark:bg-gold text-white dark:text-ebony font-black uppercase tracking-widest rounded-full"
            >
              {t('common.login')}
            </button>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow pt-[100px]">
         <Outlet />
      </main>

      {/* ── Footer ────────────────────────── */}
      <footer className="bg-white dark:bg-[#05070a] pt-32 pb-16 border-t border-slate-200 dark:border-white/5 relative overflow-hidden transition-colors duration-500">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 dark:bg-primary/10 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 dark:bg-gold/5 blur-[150px] rounded-full pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 mb-24">
            <div className="space-y-10">
              <div className="flex items-center gap-4">
                <img src="/pp-logo.png" alt="Logo" className="w-14 h-14 object-contain" />
                <div>
                  <h3 className="text-slate-900 dark:text-white font-black tracking-tighter leading-none text-xl">{t('common.prosperity_party')}</h3>
                  <p className="text-[10px] text-primary dark:text-gold font-bold uppercase tracking-[0.4em] mt-1">{t('common.app_subtitle')}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium max-w-sm">
                Empowering the community through digital transformation and transparent membership management for the Dire Dawa Branch.
              </p>
              <div className="flex gap-6">
                {['facebook', 'twitter', 'linkedin', 'instagram'].map(social => (
                  <a key={social} href="#" className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-primary dark:hover:bg-transparent hover:text-white dark:hover:text-gold hover:border-primary dark:hover:border-gold transition-all duration-300">
                    <Globe size={18} />
                  </a>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-slate-900 dark:text-white font-black text-xs uppercase tracking-[0.4em] mb-12 relative inline-block">
                Quick Navigation
                <span className="absolute -bottom-4 left-0 w-8 h-[2px] bg-primary dark:bg-gold"></span>
              </h4>
              <ul className="space-y-6">
                {['Home', 'About Us', 'Core Features', 'Membership Portal', 'Public Reports'].map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-gold transition-all duration-300 flex items-center gap-2 group font-semibold">
                      <span className="w-0 h-[1px] bg-primary dark:bg-gold transition-all duration-300 group-hover:w-4"></span>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-slate-900 dark:text-white font-black text-xs uppercase tracking-[0.4em] mb-12 relative inline-block">
                Legal & Security
                <span className="absolute -bottom-4 left-0 w-8 h-[2px] bg-primary dark:bg-gold"></span>
              </h4>
              <ul className="space-y-6">
                {['Privacy Policy', 'Terms of Service', 'Security Standards', 'Data Protection', 'Contact Support'].map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-gold transition-all duration-300 flex items-center gap-2 group font-semibold">
                      <span className="w-0 h-[1px] bg-primary dark:bg-gold transition-all duration-300 group-hover:w-4"></span>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-slate-900 dark:text-white font-black text-xs uppercase tracking-[0.4em] mb-12 relative inline-block">
                Office Contact
                <span className="absolute -bottom-4 left-0 w-8 h-[2px] bg-primary dark:bg-gold"></span>
              </h4>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Phone size={18} className="text-primary dark:text-gold" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    General Inquiries<br />
                    <span className="text-slate-900 dark:text-white text-lg font-bold">+251 911 000 000</span>
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Mail size={18} className="text-primary dark:text-gold" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Support Email<br />
                    <span className="text-slate-900 dark:text-white font-bold">support@pp-diredawa.org</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-12 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">
              &copy; {getEthiopianYear()} Prosperity Party Dire Dawa Branch &bull; Developed by High-End Digital Team
            </p>
            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-600">
               <Shield size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest">Secure AES-256 Encrypted</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
