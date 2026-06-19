import { useState, useEffect } from 'react';
import { motion as m, AnimatePresence as Ap } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface GalleryImage {
  id: number | string;
  title: string;
  description: string;
  image: string;
  category: string;
  isActive?: boolean;
}

interface GalleryProps {
  galleryImages: GalleryImage[];
  hideTitle?: boolean;
  compact?: boolean;
}

export default function Gallery({ galleryImages, hideTitle = false, compact = false }: GalleryProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Combine DB images with static fallback assets if not already populated
  const defaultImages: GalleryImage[] = [
    {
      id: 'static-building',
      title: t('landing.gallery_building_title'),
      description: t('landing.gallery_building_desc'),
      image: '/photos/building.jpg',
      category: 'building'
    },
    {
      id: 'static-gate',
      title: t('landing.gallery_gate_title'),
      description: t('landing.gallery_gate_desc'),
      image: '/photos/gate.jpg',
      category: 'gate'
    },
    {
      id: 'static-leadership',
      title: t('landing.gallery_leadership_title'),
      description: t('landing.gallery_leadership_desc'),
      image: '/photos/leadership.jpg',
      category: 'leadership'
    },
    {
      id: 'static-meeting1',
      title: t('landing.gallery_meeting1_title'),
      description: t('landing.gallery_meeting1_desc'),
      image: '/photos/meeting-1.jpg',
      category: 'meetings'
    },
    {
      id: 'static-meeting2',
      title: t('landing.gallery_meeting2_title'),
      description: t('landing.gallery_meeting2_desc'),
      image: '/photos/meeting-2.jpg',
      category: 'meetings'
    }
  ];

  const imagesToDisplay = galleryImages.length > 0 
    ? galleryImages.filter(img => img.isActive !== false) 
    : defaultImages;

  const filteredImages = filter === 'all' 
    ? imagesToDisplay 
    : imagesToDisplay.filter(img => img.category?.toLowerCase() === filter.toLowerCase());

  const categories = [
    'all',
    'building',
    'leadership',
    'meetings',
    'events',
    'community',
    ...Array.from(new Set(imagesToDisplay.map(img => img.category?.toLowerCase() || 'gallery')))
      .filter(c => !['all', 'building', 'leadership', 'meetings', 'events', 'community', 'gallery'].includes(c))
  ];

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextImage = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % filteredImages.length);
  };

  const prevImage = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + filteredImages.length) % filteredImages.length);
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredImages]);

  return (
    <section id="gallery" className={`${compact ? 'py-8' : 'py-28 lg:py-36'} bg-white dark:bg-slate-950 relative [perspective:1200px]`}>
      <div className={`${compact ? 'w-full px-4 sm:px-6' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
        
        {!hideTitle && (
          <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight font-outfit text-gray-900 dark:text-white">
                Our Gallery
              </h2>
          </div>
        )}

        {/* Filter Bar */}
        <div className={`flex flex-wrap ${compact ? 'justify-start' : 'justify-center'} gap-2 mb-12`}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                filter === cat
                  ? 'bg-[#0B5D3B] text-white dark:bg-[#D4AF37] dark:text-slate-950 shadow-md scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-900 dark:text-gray-400 dark:hover:bg-slate-800'
              }`}
            >
              {cat === 'all' ? t('common_ui.all') : t(`landing.gallery_category_${cat}`, cat.charAt(0).toUpperCase() + cat.slice(1))}
            </button>
          ))}
        </div>

        {/* Masonry Grid */}
        <div className="gallery-grid [transform-style:preserve-3d]">
          {filteredImages.map((img, idx) => {
            const isFeatured = idx === 0 || idx === 3;
            return (
              <m.div
                key={img.id}
                layoutId={`img-${img.id}`}
                onClick={() => openLightbox(idx)}
                initial={{ opacity: 0, scale: 0.85, rotateY: 10 }}
                whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                whileHover={{ scale: 1.03, rotateY: -3, z: 20 }}
                className={`group relative rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-2xl transition-all duration-500 bg-gray-100 dark:bg-slate-900 [transform-style:preserve-3d] ${
                  isFeatured ? 'gallery-grid-item-featured' : ''
                }`}
              >
                <div className="w-full h-full relative">
                  <img
                    src={img.image}
                    alt={img.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/pp-logo.png'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500"></div>
                  
                  <div className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ZoomIn className="w-4 h-4" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-3 group-hover:translate-y-0 transition-transform duration-500">
                    <span className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest">{img.category || t('landing.photo_gallery')}</span>
                    <h3 className="text-white font-black text-sm uppercase tracking-wide mt-1 font-outfit line-clamp-1">{img.title}</h3>
                    <p className="text-gray-300 text-[11px] mt-1 line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75">
                      {img.description}
                    </p>
                  </div>
                </div>
              </m.div>
            );
          })}
        </div>

        {!compact && (
          <div className="flex justify-center mt-16">
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#0B5D3B] hover:bg-[#094a2f] text-white font-black rounded-xl transition-all duration-300 text-xs uppercase tracking-wider shadow-lg shadow-[#0B5D3B]/10 hover:shadow-xl"
            >
              {t('buttons.see_more')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <Ap>
        {lightboxIndex !== null && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 select-none"
          >
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 text-white/75 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Left Navigate */}
            <button
              onClick={prevImage}
              className="absolute left-4 sm:left-8 text-white/75 hover:text-white p-3 rounded-2xl hover:bg-white/10 transition-all active:scale-95"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            {/* Image Container */}
            <div className="max-w-4xl max-h-[80vh] flex flex-col items-center">
              <m.img
                key={lightboxIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                src={filteredImages[lightboxIndex].image}
                alt={filteredImages[lightboxIndex].title}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
              />
              <div className="text-center mt-5 text-white max-w-xl">
                <h4 className="font-bold text-lg font-outfit">{filteredImages[lightboxIndex].title}</h4>
                <p className="text-gray-400 text-xs mt-2 leading-relaxed">{filteredImages[lightboxIndex].description}</p>
                <div className="text-[10px] text-gray-500 font-mono mt-3">
                  {t('common_ui.no')} {lightboxIndex + 1} {t('table.of')} {filteredImages.length}
                </div>
              </div>
            </div>

            {/* Right Navigate */}
            <button
              onClick={nextImage}
              className="absolute right-4 sm:right-8 text-white/75 hover:text-white p-3 rounded-2xl hover:bg-white/10 transition-all active:scale-95"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </m.div>
        )}
      </Ap>
    </section>
  );
}
