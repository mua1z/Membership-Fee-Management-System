import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../lib/api'
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Statistics from '../components/landing/Statistics';
import About from '../components/landing/About';
import Features from '../components/landing/Features';
import SmartAdmin from '../components/landing/SmartAdmin';
import Trust from '../components/landing/Trust';
import Leadership from '../components/landing/Leadership';
import Gallery from '../components/landing/Gallery';
import News from '../components/landing/News';
import Security from '../components/landing/Security';
import Contact from '../components/landing/Contact';
import CTA from '../components/landing/CTA';
import Footer from '../components/landing/Footer';
import ScrollToTop from '../components/landing/ScrollToTop';
import PageLoader from '../components/PageLoader';

export default function Landing() {
  const { t } = useTranslation();
  const navLinks = [
    { name: t('nav.home'), href: '#hero' },
    { name: t('nav.about'), href: '#about' },
    { name: t('nav.features'), href: '#features' },
    { name: t('nav.gallery'), href: '#gallery' },
    { name: t('nav.contact'), href: '#contact' }
  ];
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalPayments: 0,
    totalRevenue: 0,
    totalSectors: 0,
    collectionRate: 0
  });
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, contentRes] = await Promise.all([
          api.get('/landing/stats'),
          api.get('/landing/content')
        ]);
        if (statsRes.data.success) {
          setStats(statsRes.data.data);
        }
        if (contentRes.data.success) {
          setContent(contentRes.data.data.content || {});
          setGalleryImages(contentRes.data.data.images || []);
        }
      } catch (err) {
        console.error('Failed to load landing page records:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  // Identify categories for images
  const featuredImages = galleryImages.filter((i: any) => i.isFeatured);
  const heroImages = galleryImages.filter((i: any) => i.category === 'hero');
  const leadershipImages = galleryImages.filter((i: any) => i.category === 'leadership');
  
  const heroFeatured = featuredImages.length > 0 ? featuredImages[0] : null;
  const heroBg = heroFeatured ? heroFeatured.image : (heroImages.length > 0 ? heroImages[0].image : '/photos/building.jpg');
  const leaderImg = leadershipImages.length > 0 ? leadershipImages[0].image : '/photos/leadership.jpg';
  const aboutImg = '/photos/gate.jpg';
  const ctaBg = heroBg;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-150 overflow-x-hidden">
      
      {/* 1. STICKY NAVIGATION */}
      <Navbar scrolled={scrolled} navLinks={navLinks} />

      {/* 2. HERO SECTION (With stats overlay) */}
      <Hero stats={stats} content={content} heroBg={heroBg} />

      {/* 3. LIVE STATISTICS */}
      <Statistics stats={stats} content={content} />

      {/* 4. ABOUT BRANCH */}
      <About content={content} aboutImg={aboutImg} />

      {/* 5. FEATURES */}
      <Features />

      {/* 6. SMART ADMINISTRATION */}
      <SmartAdmin />

      {/* 7. WHY TRUST THIS PLATFORM */}
      <Trust />

      {/* 8. LEADERSHIP MESSAGE */}
      <Leadership content={content} leaderImg={leaderImg} />

      {/* 9. EVENTS & GALLERY */}
      <Gallery galleryImages={galleryImages} />

      {/* 10. NEWS & ANNOUNCEMENTS */}
      <News galleryImages={galleryImages} />

      {/* 11. SECURITY & TRANSPARENCY */}
      <Security />

      {/* 12. DEDICATED CONTACT INFO & MAPS */}
      <Contact content={content} />

      {/* 13. CALL TO ACTION */}
      <CTA content={content} ctaBg={ctaBg} />

      {/* 14. ENTERPRISE FOOTER */}
      <Footer content={content} />

      {/* 15. FLOATING ACTION CONTROLS */}
      <ScrollToTop />

    </div>
  );
}
