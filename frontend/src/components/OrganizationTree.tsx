import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Building2, Users, MapPin, Trees, GraduationCap, Stethoscope } from 'lucide-react'
import api from '../lib/api'
import { useTranslation } from 'react-i18next'
import PageLoader from './PageLoader'

interface OrgLeaf {
  id: string
  categoryId: number
  name: string
  count: number
}

interface OrgUnit {
  id: number
  name: string
  total: number
  children: OrgLeaf[] | OrgUnit[]
}

interface OrgType {
  id: number
  name: string
  total: number
  children: OrgUnit[]
}

interface OrgData extends Array<OrgType> {}

const amharicNames: Record<string, string> = {
  // Sector Types (exact DB keys)
  'Institution': 'ድሬዳዋ መንግስት ተቋማት',
  'Urban Woreda': 'የከተማ ወረዳ',
  'Rural Cluster': 'የገጠር ክላስተር',
  'Secondary School': 'ሁለተኛ ደረጃ ትምህርት ቤቶች',
  'Health Institution': 'የጤና ተቋማት',

  // Institutions (exact DB keys)
  'Mayor Office': 'ከንቲባ ፅህፈትቤት',
  'Prosperity Party Dire Dawa Branch Office': 'ድሬዳዋ ብልፅግና ፓርቲ ቅርንጫፍ ፅህፈትቤት',
  'Council': 'ምክርቤት',
  'Mass Media Agency': 'ብዙሃን መገናኛ ኤጀንሲ',
  'Office of the Auditor General': 'ዋና ኦዲተር ፅህፈትቤት',
  'Trade Industry and Investment Bureau': 'ንግድ አንዱስትሪና ኢንቨስትመንት ቢሮ',
  'Micro and Medium Manufacturing Corporation': 'የአነስተኛና መካከለኛ ማኑፋክቸሪንግ ኮርፖሬሽን',
  'Finance and Economic Development Bureau': 'ገንዘብና ኢኮኖሚ ልማት ቢሮ',
  'Revenue Authority': 'ገቢዎች ባለስልጣን',
  'Government Communication Affairs Bureau': 'መንግስት ኮሚኒኬሽን ጉዳዮች ቢሮ',
  'Construction and Urban Development Bureau': 'ኮንስትራክሽንና ከተማ ልማት ቢሮ',
  'Labor and Skills Bureau': 'ስራና ክህሎት ቢሮ',
  'Agriculture Water Mines and Energy Bureau': 'ግብርና ውሃ ማዕድንና ኢነርጂ ቢሮ',
  'Land Development and Management Bureau': 'መሬት ልማትና ማኔጀመንት ቢሮ',
  'Justice Security and Legal Affairs Bureau': 'ፍትህ ፀጥታና ህግ ጉዳዮች ቢሮ',
  'Public Service and Human Resource Development Bureau': 'ፐብሊክ ሰርቪስና የሰው ሀብት ልማት ቢሮ',
  'Education Bureau': 'ትምህርት ቢሮ',
  '18.1 Dire Dawa General Secondary School': 'ድሬዳዋ አጠቃላይ ሁለተኛ ደረጃ ትምህርት ቤት',
  '18.2 Addis Ketema Secondary School': 'አዲስ ከተማ ሁለተኛ ደረጃ ትምህርት ቤት',
  '18.3 Legehare Secondary School': 'ለሀገሀሬ ሁለተኛ ደረጃ ትምህርት ቤት',
  '18.4 Afetisa Secondary School': 'አፈትኢሳ ሁለተኛ ደረጃ ትምህርት ቤት',
  '18.5 Mariam Sefer Secondary School': 'ማሪያም ሰፈር ሁለተኛ ደረጃ ትምህርት ቤት',
  '18.6 Sabiyan Secondary School': 'ሳቢያን ሁለተኛ ደረጃ ትምህርት ቤት',
  '18.7 Adisu Secondary School': 'አዲሱ ሁለተኛ ደረጃ ትምህርት ቤት',
  '18.8 Melka Jebdu Secondary School': 'መልካ ጀብዱ ሁለተኛ ደረጃ ትምህርት ቤት',
  'Women Children and Social Affairs Bureau': 'ሴቶች ህፃናትና ማህበራዊ ጉዳዮች ቢሮ',
  'Health Bureau': 'ጤና ቢሮ',
  '21.1 Dil Chora Hospital': 'ዲል ጮራ ሆስፒታል',
  '21.2 Sabiyan Hospital': 'ሰቢያን ሆስፒታል',
  '21.3 Legehare Health Center': 'ለገሀሬ ጤና ጣቢያ',
  '21.4 Dire Dawa Health Center': 'ድሬደዋ ጤና ጣቢያ',
  '21.5 Genda Kore Health Center': 'ገንደቆሬ ጤና ጣቢያ',
  '21.6 Addis Ketema Health Center': 'አዲስ ከተማ ጤና ጣቢያ',
  '21.7 Goro Health Center': 'ጎሮ ጤና ጣቢያ',
  '21.8 Melka Health Center': 'መልካ ጤና ጣቢያ',
  '21.9 Industrial Village Health Center': 'ኢንዱስትሪ መንደር ጤና ጣቢያ',
  '21.10 Dechatu Health Center': 'ደቻቱ ጤና ጣቢያ',
  '21.11 Genda Gerada Health Center': 'ገንደ ገራደ ጤና ጣቢያ',
  'City Manager Office': 'ከተማ ስራ አስኪያጅ ፅህፈት ቤት',
  'Water and Sewerage Authority': 'ውሃና ፍሳሽ ባለስልጣን',

  // Urban Woredas (exact DB keys)
  'Woreda 1': 'ወረዳ 1',
  'Woreda 2': 'ወረዳ 2',
  'Woreda 3': 'ወረዳ 3',
  'Woreda 4': 'ወረዳ 4',
  'Woreda 5': 'ወረዳ 5',
  'Woreda 6': 'ወረዳ 6',
  'Woreda 7': 'ወረዳ 7',
  'Woreda 8': 'ወረዳ 8',
  'Woreda 9': 'ወረዳ 9',

  // Rural Clusters (exact DB keys)
  'Biyyo Awwalle Cluster': 'ቢዮ አዋሌ ክላስተር',
  'Wahel Cluster': 'ዋሄል ክላስተር',
  'Aseliso Cluster': 'አሰሊሶ ክላስተር',
  'Jeldessa Cluster': 'ጀልዴሳ ክላስተር',

  // Member Categories (exact DB keys)
  'Employee Members': 'መንግስት ሰራተኞች አባላት',
  'Employee Youth Wing Members': 'መንግስት ሰራተኞች የወጣቶች ክንፍ',
  'Employee Women Wing Members': 'መንግስት ሰራተኞች የሴቶች ክንፍ',
  'Urban Residents Members': 'የከተማ ነዋሪዎች አባላት',
  'Enterprises': 'የጥቃቅንና አነስተኛ አባላት',
  'Student Members': 'የተማሪ አባላት',
  'Investors': 'ደጋፊ ባለሀብቶች',
  'Resident Youth Wing Members': 'የነዋሪ አባላት ወጣቶች ክንፍ',
  'Resident Women Wing Members': 'የነዋሪዎች አባላት ሴቶች ክንፍ',
  'Farmer Members': 'የአርሶ አደር አባላት',
}

const typeIcons: Record<string, React.ReactNode> = {
  'Institution': <Building2 className="w-5 h-5" />,
  'Urban Woreda': <MapPin className="w-5 h-5" />,
  'Rural Cluster': <Trees className="w-5 h-5" />,
  'Secondary School': <GraduationCap className="w-5 h-5" />,
  'Health Institution': <Stethoscope className="w-5 h-5" />,
}

function TreeNode({ name, children, total, depth }: {
  name: string
  children?: any[]
  total?: number
  depth: number
}) {
  const [open, setOpen] = useState(false)
  const { i18n } = useTranslation()
  const lang = i18n.language || 'en'

  const am = amharicNames[name]
  const displayName = lang === 'am' && am ? am : name

  const hasChildren = children && children.length > 0

  return (
    <div className="select-none">
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-[var(--gold)]/5 text-left ${
          depth === 0 ? 'bg-[var(--gold)]/10 border border-[var(--gold)]/20' :
          depth === 1 ? 'bg-white dark:bg-slate-800/50' : ''
        }`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="w-4 h-4 shrink-0 text-[var(--gold)]" /> :
                 <ChevronRight className="w-4 h-4 shrink-0 text-[var(--gold)]" />
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {depth === 0 && (
          <Users className="w-4 h-4 shrink-0 text-[var(--gold)]" />
        )}

        <span className={`flex-1 text-sm ${
          depth === 0 ? 'font-bold text-[var(--gold)]' :
          depth === 1 ? 'font-semibold text-slate-800 dark:text-slate-200' :
          depth === 2 ? 'font-medium text-slate-700 dark:text-slate-300' :
          'font-normal text-slate-600 dark:text-slate-400'
        }`}>
          {displayName}
          {lang === 'en' && am && depth > 0 && (
            <span className="ml-2 text-[10px] text-slate-400 dark:text-slate-500">/{am}</span>
          )}
        </span>

        {total !== undefined && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
            total > 0
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
          }`}>
            {total}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children.map((child: any, idx: number) => (
              <TreeNode
                key={child.id || idx}
                name={child.name}
                children={child.children}
                total={child.total !== undefined ? child.total : child.count}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function OrganizationTree() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    api.get('/dashboard/organization')
      .then(res => setData(res.data.data))
      .catch(err => console.error('Org fetch error:', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader message={t('common.analytics_loading')} />

  if (!data || data.length === 0) {
    return (
      <div className="card text-center py-12">
        <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        <p className="text-slate-500 font-medium">No organization data available</p>
        <p className="text-xs text-slate-400 mt-1">Run the seed script to populate the organization structure</p>
      </div>
    )
  }

  const tab = data[activeTab]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[var(--gold)]" />
            {t('common.prosperity_party')} <span className="text-[var(--gold)]">Organization</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {data[activeTab] ? (
              <>{amharicNames[data[activeTab].name] || data[activeTab].name} — {data.reduce((s, t) => s + t.total, 0)} total members</>
            ) : 'Loading...'}
          </p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-700 pb-1 overflow-x-auto">
        {data.map((type, idx) => {
          const am = amharicNames[type.name]
          const label = i18n.language === 'am' && am ? am : type.name
          const Icon = typeIcons[type.name]
          return (
            <button
              key={type.id}
              onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === idx
                  ? 'bg-[var(--gold)]/10 text-[var(--gold)] border-b-2 border-[var(--gold)]'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {Icon}
              <span className="hidden sm:inline">{label}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 sm:hidden">{label}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === idx
                  ? 'bg-[var(--gold)] text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
              }`}>
                {type.total}
              </span>
            </button>
          )
        })}
      </div>

      <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            {tab.children.map((unit, idx) => (
              <TreeNode key={unit.id} name={unit.name} children={unit.children} total={unit.total} depth={1} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {tab.children.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No units in this category</p>
        </div>
      )}
    </motion.div>
  )
}
