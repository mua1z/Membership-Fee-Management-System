import { useState } from 'react';
import NewsManager from './NewsManager';
import LandingPageManager from './LandingPageManager';
import { FileText, Image as ImageIcon } from 'lucide-react';

export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState('news');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold font-outfit text-gray-900 dark:text-white">Content Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage news articles, announcements, and gallery images</p>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button 
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'news' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <FileText className="w-4 h-4" />
            News & Announcements
          </button>
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'gallery' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <ImageIcon className="w-4 h-4" />
            Gallery Images
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'news' ? <NewsManager isComponent={true} /> : <LandingPageManager isComponent={true} />}
      </div>
    </div>
  );
}
