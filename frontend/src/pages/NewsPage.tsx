import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronRight, ImageIcon, ExternalLink, Send, X } from 'lucide-react';
import FacebookFeed from '../components/FacebookFeed';
import api from '../lib/api';
import PageHero from '../components/landing/PageHero';
import PageLoader from '../components/PageLoader';

interface NewsItem {
  id: number;
  title: string;
  content: string;
  image: string | null;
  category: string;
  createdAt: string;
}

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

export default function NewsPage() {
  const { t, i18n } = useTranslation();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await api.get('/news/latest?count=20');
        if (res.data.success) setNews(res.data.data);
      } catch (err) {
        console.error('Failed to load news:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  if (loading) return <PageLoader />;

  const lang = i18n.language?.startsWith('am') ? 'am' :
               i18n.language?.startsWith('om') ? 'om' :
               i18n.language?.startsWith('so') ? 'so' : 'en';

  return (
    <div>
      <PageHero title="News & Announcements" />

      <section className="py-16 lg:py-24 bg-gray-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-10">

            {/* ── Left Column (70%) – Admin News Posts ── */}
            <div className="w-full lg:w-[70%]">
              <h2 className="text-2xl md:text-3xl font-black font-outfit text-gray-900 dark:text-white mb-8">
                {t('news.latest_articles', 'Latest Articles')}
              </h2>

              {news.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{t('news.no_articles', 'No news articles yet.')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-2 overflow-y-auto custom-scrollbar" style={{ maxHeight: '1000px' }}>
                  {news.map((item) => (
                    <article key={item.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                      <div className="flex flex-col flex-1">
                        {item.image && (
                          <div className="w-full h-48 flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-slate-800">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105 cursor-pointer"
                              onClick={() => item.image && setSelectedImage(item.image)}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        )}
                        <div className="p-6 flex flex-col flex-1 justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#0B5D3B]/10 text-[#0B5D3B] dark:bg-[#D4AF37]/10 dark:text-[#D4AF37]">
                                {item.category || t('news.news', 'News')}
                              </span>
                              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                <Calendar className="w-3 h-3" />
                                {new Date(item.createdAt).toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                            </div>
                            <h3 className="text-lg md:text-xl font-black text-gray-900 dark:text-white font-outfit leading-snug mb-3">
                              {item.title}
                            </h3>
                            <p className={`text-sm text-black dark:text-white font-bold leading-relaxed ${expanded.has(item.id) ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
                              {item.content}
                            </p>
                          </div>
                          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800/50">
                            <button 
                              onClick={() => toggleExpand(item.id)}
                              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0B5D3B] dark:text-[#D4AF37] hover:underline group"
                            >
                              {expanded.has(item.id) ? t('common.show_less', 'Show Less') : t('common.read_more', 'Read More')}
                              <ChevronRight className={`w-4 h-4 transition-transform ${expanded.has(item.id) ? '-rotate-90' : 'group-hover:translate-x-0.5'}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

            </div>

            {/* ── Right Column (30%) – Social Media Sidebar ── */}
            <div className="w-full lg:w-[30%] space-y-6">
              <div className="sticky top-24 space-y-6">

                {/* Facebook Feed – displays page posts automatically */}
                <FacebookFeed />

                {/* YouTube Embed via SociableKit */}
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

                {/* All Social Links */}
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

                {/* Thank You */}
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

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={selectedImage} 
            alt="Full size" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
