import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import Hero from '../components/landing/Hero';
import Statistics from '../components/landing/Statistics';
import AboutSection from '../components/landing/About';
import FeaturesSection from '../components/landing/Features';
import GallerySection from '../components/landing/Gallery';
import NewsSection from '../components/landing/News';
import ContactSection from '../components/landing/Contact';
import PageLoader from '../components/PageLoader';

export default function Landing() {
  const { t } = useTranslation();
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

  const featuredImages = galleryImages.filter((i: any) => i.isFeatured);
  const heroImages = galleryImages.filter((i: any) => i.category === 'hero');
  const heroFeatured = featuredImages.length > 0 ? featuredImages[0] : null;
  const heroBg = heroFeatured ? heroFeatured.image : (heroImages.length > 0 ? heroImages[0].image : '/photos/leadership.jpg');
  const aboutImg = '/about1.png';

  return (
    <div>
      <Hero stats={stats} content={content} heroBg={heroBg} galleryImages={galleryImages.length > 0 ? galleryImages : heroImages} />
      <Statistics stats={stats} content={content} />

      <AboutSection content={content} aboutImg={aboutImg} />

      <FeaturesSection />

      <GallerySection galleryImages={galleryImages} />

      <NewsSection galleryImages={galleryImages} />

      <ContactSection content={content} />
    </div>
  );
}
