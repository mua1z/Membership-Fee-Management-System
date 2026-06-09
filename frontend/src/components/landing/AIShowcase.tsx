import { motion } from 'framer-motion';
import { Bot, FileText, Users, CreditCard, Download, Activity, TrendingUp, MessageSquare, Send } from 'lucide-react';

interface AIShowcaseProps {
  stats: {
    totalMembers: number;
    totalPayments: number;
    totalRevenue: number;
    totalSectors: number;
    collectionRate: number;
  };
  content: Record<string, string>;
}

export default function AIShowcase({ stats, content }: AIShowcaseProps) {
  const capabilities = [
    { icon: FileText, label: 'Generate & Export Official Reports' },
    { icon: Users, label: 'Add, Edit & Transfer Members' },
    { icon: CreditCard, label: 'Record, Approve & Audit Payments' },
    { icon: Download, label: 'Export PDF, Excel, CSV & Word Docs' },
    { icon: Activity, label: 'Detect Payment Anomalies & Arrears' },
    { icon: TrendingUp, label: 'Forecast Sector Revenue Cycles' },
    { icon: MessageSquare, label: 'Summarize Administrative Audits' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <section id="ai-showcase" className="py-28 lg:py-36 bg-slate-950 relative overflow-hidden border-t border-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(212,175,55,0.05),transparent_70%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(11,93,59,0.06),transparent_60%)]"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-16 lg:gap-20 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 space-y-6"
          >
            <span className="inline-flex items-center gap-2 text-xs font-black text-[#D4AF37] uppercase tracking-[0.3em]">
              <span className="w-6 h-px bg-[#D4AF37]/50"></span>
              {content.ai_section_title || 'AI Operations Agent'}
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight font-outfit">
              AI Administrative System
            </h2>
            <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-lg">
              {content.ai_section_description || 'Say goodbye to tedious clicking. The built-in AI Operations Agent executes high-level administrative functions directly from conversational natural language. Instantly write queries, create summaries, reset account statuses, or export detailed spreadsheet spreadsheets.'}
            </p>
            
            <div className="grid sm:grid-cols-2 gap-3 pt-4">
              {capabilities.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-4 py-3 hover:bg-white/10 hover:border-[#D4AF37]/30 transition-all duration-300"
                >
                  <item.icon className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                  <span className="text-xs text-gray-300 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6"
          >
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
              {/* Header */}
              <div className="bg-slate-900/90 px-6 py-4 border-b border-slate-800 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <div className="text-[10px] text-gray-500 font-mono ml-4">Agent Terminal — active_node_session</div>
                <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">Online</span>
                </div>
              </div>
              
              {/* Dialogue */}
              <div className="p-6 space-y-4 font-sans text-xs">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg shadow-gold/20 font-outfit">AI</div>
                  <div className="bg-slate-850 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] border border-slate-800 text-gray-200">
                    <p>Good morning. I am your AI Operations Agent. I can execute commands, query payments, reset keys, and generate reports. What can I do for you?</p>
                  </div>
                </div>
                
                <div className="flex gap-3 justify-end">
                  <div className="bg-[#0B5D3B]/20 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] border border-[#0B5D3B]/20 text-gray-200">
                    <p>Forecast the branch revenue for the next year and list active sectors.</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 font-outfit">AD</div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg shadow-gold/20 font-outfit">AI</div>
                  <div className="bg-slate-850 rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-800 text-gray-255 space-y-2 text-gray-200">
                    <p>
                      Analyzing database records... I have compiled the forecast:
                    </p>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 font-mono text-[10px] text-gray-300">
                      <div>• Total Active Sectors: <span className="text-[#D4AF37]">{stats.totalSectors}</span></div>
                      <div>• Active Collection Efficiency: <span className="text-emerald-400">{stats.collectionRate}%</span></div>
                      <div>• Estimated Annual Yield: <span className="text-white font-bold">{formatCurrency(stats.totalRevenue * 1.15)} ETB</span> (at +15% projected growth)</div>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Would you like to export this compilation report as a formatted Excel spreadsheet?
                    </p>
                  </div>
                </div>
                
                {/* Input field wrapper */}
                <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Ask the AI Operations Agent..."
                    disabled
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none"
                  />
                  <button disabled className="w-9 h-9 rounded-xl bg-[#D4AF37]/50 text-slate-950 flex items-center justify-center cursor-not-allowed">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
