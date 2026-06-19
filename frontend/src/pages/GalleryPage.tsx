import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import PageHero from '../components/landing/PageHero';
import GallerySection from '../components/landing/Gallery';
import PageLoader from '../components/PageLoader';
import { ExternalLink, Send } from 'lucide-react';
import FacebookFeed from '../components/FacebookFeed';

const SOCIAL = {
  facebook: 'https://www.facebook.com/diredawaprosperityparty',
  telegram: 'https://t.me/ddppofficial2012',
  tiktok: 'https://www.tiktok.com/@direprosperity',
  youtube: 'https://youtube.com/@Direprosperity',
  twitter: 'https://twitter.com/dire_prosp13987',
};

const sidebarLinks = [
  { url: SOCIAL.facebook, label: 'Facebook', icon: 'https://img.icons8.com/color/48/facebook-new.png', btn: 'ገፁን ይከተሉ', color: '#1877F2' },
  { url: SOCIAL.telegram, label: 'Telegram', icon: '', btn: 'ይቀላቀሉ', color: '#0088cc' },
  { url: SOCIAL.youtube, label: 'YouTube', icon: 'https://img.icons8.com/color/48/youtube-play.png', btn: 'ይመዝገቡ', color: '#FF0000' },
  { url: SOCIAL.tiktok, label: 'TikTok', icon: 'https://img.icons8.com/color/48/tiktok.png', btn: 'ይከተሉ', color: '#000000' },
  { url: SOCIAL.twitter, label: 'Twitter / X', icon: 'https://img.icons8.com/color/48/twitterx.png', btn: 'ይከተሉ', color: '#000000' },
];

export default function GalleryPage() {
  const { t } = useTranslation();
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const contentRes = await api.get('/landing/content');
        if (contentRes.data.success) {
          setGalleryImages(contentRes.data.data.images || []);
        }
      } catch (err) {
        console.error('Failed to load gallery records:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="bg-gray-50 dark:bg-slate-950 min-h-screen">
      <PageHero title="Our Gallery" />
      
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-10">
            
            {/* ── Left Column (70%) – Gallery ── */}
            <div className="w-full lg:w-[70%]">
              <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-slate-800">
                <GallerySection galleryImages={galleryImages} hideTitle={true} compact={true} />
              </div>
            </div>

            {/* ── Right Column (30%) – Social Media Sidebar ── */}
            <div className="w-full lg:w-[30%] space-y-6">
              <div className="sticky top-24 space-y-6">

                <FacebookFeed />

                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
                    <img src="https://img.icons8.com/color/48/youtube-play.png" alt="" className="w-6 h-6 rounded" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">ከድሬዳዋ ብልጽግና ፓርቲ ዩቲዩብ ገጽ</h3>
                  </div>
                  <div className="p-0">
                    <iframe
                      src="https://widgets.sociablekit.com/youtube-channel-videos/iframe/25429194"
                      width="100%" height="500"
                      style={{ border: 'none' }}
                      frameBorder="0"
                      title="YouTube"
                      className="w-full"
                    />
                  </div>
                  <div className="p-4">
                    <a href={SOCIAL.youtube} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#FF0000] hover:bg-[#cc0000] text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      ይመዝገቡ <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                    ማህበራዊ ሚዲያ
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
                    የድሬዳዋ ብልጽግና ፓርቲ ይፋዊ ማህበራዊ ሚዲያ ገፆችን ይከተሉ
                  </p>
                  <div className="space-y-2">
                    {sidebarLinks.map((s) => (
                      <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors group"
                      >
                        {s.icon ? (
                          <img src={s.icon} alt="" className="w-8 h-8 rounded" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#0088cc]/10 flex items-center justify-center">
                            <Send className="w-4 h-4 text-[#0088cc]" />
                          </div>
                        )}
                        <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                          {s.label}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors"
                          style={{ backgroundColor: `${s.color}15`, color: s.color }}
                        >
                          {s.btn}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0B5D3B] to-[#094a2f] rounded-3xl p-6 text-center shadow-sm">
                  <p className="text-white text-lg font-bold font-outfit leading-relaxed">
                    ስለ አብሮነትዎ እናመሰግናለን!
                  </p>
                  <p className="text-[#D4AF37] text-xs mt-2 font-medium uppercase tracking-wider">
                    Prosperity Party Dire Dawa Branch
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
