
import React, { useRef } from 'react';
import { Story, MaturityLevel } from '../types';

interface LibraryProps {
  stories: Story[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: (title: string, content: string) => void;
  blurMature: boolean;
  isDarkMode: boolean;
}

const Library: React.FC<LibraryProps> = ({ stories, onSelect, onDelete, onImport, blurMature, isDarkMode }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const title = file.name.replace(/\.[^/.]+$/, "");
      onImport(title, content);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className={`flex-1 p-10 overflow-y-auto transition-colors duration-500 ${isDarkMode ? 'bg-gray-950' : 'bg-[#fdfbf7]'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h2 className={`text-5xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-red-950'}`}>আমার লাইব্রেরি</h2>
            <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-600'} mt-3 text-lg`}>আপনার সাহিত্যিক সংগ্রহের সকল সৃষ্টি এখানে আছে</p>
          </div>
          <div className="flex gap-4">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt" className="hidden" />
            <button 
              onClick={handleImportClick}
              className={`px-8 py-3 font-bold rounded-2xl transition-all flex items-center gap-3 shadow-lg ${
                isDarkMode 
                  ? 'bg-gray-900 border border-gray-800 text-gray-300 hover:bg-gray-800' 
                  : 'bg-white border-2 border-red-800 text-red-800 hover:bg-red-50'
              }`}
            >
              📥 ইমপোর্ট টেক্সট
            </button>
          </div>
        </div>

        {stories.length === 0 ? (
          <div className={`text-center py-48 border-4 border-dashed rounded-[60px] ${isDarkMode ? 'bg-gray-900/40 border-gray-800 text-gray-600' : 'bg-white/60 border-gray-200 text-gray-300'}`}>
            <span className="text-8xl block mb-6">🏜️</span>
            <p className="text-2xl font-bold">এখনো কোনো গল্প নেই।</p>
            <p className="mt-2">নতুন একটি গল্প শুরু করে আপনার যাত্রা আরম্ভ করুন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {stories.map((story) => {
              const isMature = story.maturity === MaturityLevel.MATURE;
              const shouldBlur = isMature && blurMature;
              
              return (
                <div 
                  key={story.id} 
                  className={`group rounded-[40px] shadow-sm hover:shadow-2xl transition-all border overflow-hidden flex flex-col hover:-translate-y-2 ${
                    isMature 
                      ? (isDarkMode ? 'bg-purple-900/10 border-purple-900/40' : 'bg-purple-50/50 border-purple-100') 
                      : (isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100')
                  }`}
                >
                  <div 
                    className={`h-4 w-full cursor-pointer transition-colors ${isMature ? 'bg-purple-900' : 'bg-red-900'}`}
                    onClick={() => onSelect(story.id)}
                  />
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-5">
                      <h3 
                        onClick={() => onSelect(story.id)}
                        className={`text-2xl font-bold cursor-pointer line-clamp-2 leading-tight ${isMature ? 'text-purple-400' : (isDarkMode ? 'text-white' : 'text-red-900')}`}
                      >
                        {story.title}
                      </h3>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(story.id); }} 
                        className={`p-3 rounded-full transition-all ${isDarkMode ? 'text-gray-700 hover:text-red-500 hover:bg-red-500/10' : 'text-gray-300 hover:text-red-600 hover:bg-red-50'}`}
                        title="Delete Story"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    <div className={`relative flex-1 mb-8 ${shouldBlur ? 'filter blur-md' : ''}`}>
                      <p className={`line-clamp-4 text-base leading-relaxed font-serif ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {story.content || 'গল্পের কোনো বিষয়বস্তু নেই। দ্রুত শুরু করুন!'}
                      </p>
                      {shouldBlur && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-2xl p-4 text-center">
                          <span className="text-3xl mb-2">🔞</span>
                          <span className="text-[10px] font-black tracking-widest text-white/80 uppercase">Mature Content</span>
                        </div>
                      )}
                    </div>

                    <div className={`flex items-center justify-between mt-auto pt-6 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isMature ? 'bg-purple-900/40 text-purple-400' : (isDarkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-700')}`}>
                          {isMature ? 'Adult' : 'General'}
                        </span>
                        {story.tone && (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                            {story.tone}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] opacity-30 font-bold">{new Date(story.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
