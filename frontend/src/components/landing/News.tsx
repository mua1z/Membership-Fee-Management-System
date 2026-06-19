import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Bell, Users, ChevronRight, Award, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';

interface NewsItem {
  id: string | number;
  title: string;
  description: string;
  category: string;
  date: string;
  image?: string;
}

interface NewsProps {
  galleryImages: any[];
}

export default function News({ galleryImages }: NewsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [actualNews, setActualNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await api.get('/news/latest?count=3');
        if (res.data.success) {
          setActualNews(res.data.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.content,
            category: item.category || 'News',
            date: new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
            image: item.image
          })));
        }
      } catch (err) {
        console.error('Failed to load latest news:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const defaultNews: NewsItem[] = [
    {
      id: 'news-1',
      title: t('landing.news_item1_title'),
      description: t('landing.news_item1_desc'),
      category: t('landing.news_item1_cat'),
      date: 'June 08, 2026',
      image: '/photos/building.jpg'
    },
    {
      id: 'news-2',
      title: t('landing.news_item2_title'),
      description: t('landing.news_item2_desc'),
      category: t('landing.news_item2_cat'),
      date: 'June 05, 2026',
      image: '/photos/meeting-1.jpg'
    },
    {
      id: 'news-3',
      title: t('landing.news_item3_title'),
      description: t('landing.news_item3_desc'),
      category: t('landing.news_item3_cat'),
      date: 'May 28, 2026',
      image: '/photos/meeting-2.jpg'
    }
  ];

  const newsItems = actualNews.length > 0 ? actualNews : defaultNews;

  return (
    <section id="news" className="py-28 lg:py-36 bg-gray-50 dark:bg-slate-950 relative [perspective:1200px]">
      <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-[#0B5D3B]/[0.01] to-transparent pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight font-outfit text-gray-900 dark:text-white">
              News & Announsment
            </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 [transform-style:preserve-3d]">
          {newsItems.slice(0, 3).map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30, rotateX: 10 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              whileHover={{ y: -10, rotateY: 3, z: 30 }}
              className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:border-[#0B5D3B]/20 transition-all duration-300 flex flex-col justify-between group [transform-style:preserve-3d]"
            >
              <div className="[transform-style:preserve-3d]">
                <div className="aspect-video relative overflow-hidden bg-gray-100 dark:bg-slate-800">
                  <img
                    src={item.image || '/pp-logo.png'}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/pp-logo.png'; }}
                  />
                  <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md text-[#D4AF37] text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-[#D4AF37]/25 [transform:translateZ(20px)]">
                    {item.category}
                  </div>
                </div>

                <div className="p-8 space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-[#0B5D3B] dark:text-[#D4AF37]" />
                    {item.date}
                  </div>

                  <h3 className="text-lg font-black text-gray-900 dark:text-white font-outfit leading-snug group-hover:text-[#0B5D3B] dark:group-hover:text-[#D4AF37] transition-colors duration-300 [transform:translateZ(15px)]">
                    {item.title}
                  </h3>

                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed [transform:translateZ(10px)]">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="p-8 pt-0 mt-4 [transform:translateZ(20px)]">
                <button onClick={() => navigate('/news')} className="w-full py-3 border border-gray-200 dark:border-slate-800 hover:border-[#0B5D3B] dark:hover:border-[#D4AF37] text-gray-700 dark:text-gray-300 hover:text-[#0B5D3B] dark:hover:text-[#D4AF37] font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 group">
                  {t('common.read_more')}
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center mt-16">
          <button
            onClick={() => navigate('/news')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#0B5D3B] hover:bg-[#094a2f] text-white font-black rounded-xl transition-all duration-300 text-xs uppercase tracking-wider shadow-lg shadow-[#0B5D3B]/10 hover:shadow-xl"
          >
            {t('buttons.see_more')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
