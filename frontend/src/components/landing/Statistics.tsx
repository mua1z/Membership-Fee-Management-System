import { motion } from 'framer-motion';
import { Users, CreditCard, Wallet, Activity, Building2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface StatisticsProps {
  stats: {
    totalMembers: number;
    totalPayments: number;
    totalRevenue: number;
    totalSectors: number;
    collectionRate: number;
  };
  content: Record<string, string>;
}

function Counter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 });

  useEffect(() => {
    if (!inView) return;
    let startTime: number;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease out
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, end, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function Statistics({ stats, content }: StatisticsProps) {
  const { t } = useTranslation();

  const statItems = [
    {
      icon: Users,
      value: stats.totalMembers,
      label: t('landing.stat_members'),
      suffix: ''
    },
    {
      icon: CreditCard,
      value: stats.totalPayments,
      label: t('landing.stat_payments'),
      suffix: ''
    },
    {
      icon: Wallet,
      value: stats.totalRevenue,
      label: t('landing.stat_revenue'),
      suffix: ' ETB'
    },
    {
      icon: Building2,
      value: stats.totalSectors,
      label: t('landing.stat_sectors'),
      suffix: ''
    },
    {
      icon: Activity,
      value: stats.collectionRate,
      label: t('landing.stat_collection'),
      suffix: '%'
    }
  ];

  return (
    <section id="statistics" className="py-24 bg-slate-950 text-white relative overflow-hidden border-y border-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.04),transparent_60%)]"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-3">
            <span className="w-6 h-px bg-[#D4AF37]/50"></span>
            {content.stats_section_title || t('landing.stats_title')}
            <span className="w-6 h-px bg-[#D4AF37]/50"></span>
          </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight font-outfit text-white">
              {t('landing.stats_title')}
            </h2>
            <p className="text-sm text-gray-400 mt-4 max-w-lg mx-auto">
              {t('landing.stats_subtitle')}
            </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {statItems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="text-center bg-white/5 border border-white/5 rounded-2xl p-6 hover:bg-white/10 hover:border-white/10 transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] mb-5">
                <item.icon className="w-5 h-5" />
              </div>
              <div className="text-3xl md:text-4xl font-black text-white font-outfit mb-2">
                <Counter end={item.value} suffix={item.suffix} />
              </div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
