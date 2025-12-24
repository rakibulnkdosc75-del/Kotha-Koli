
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
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <h2 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-red-950'}`}>আমার লাইব্রেরি</h2>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>আপনার সকল সৃষ্টি এখানে সংরক্ষিত আছে</p>
          </div>
          <div className="flex gap-3">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt" className="hidden" />
            <button 
              onClick={handleImportClick}
              className={`px-5 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800' 
                  : 'bg-white border-2 border-red-800 text-red-800 hover:bg-red-50'
              }`}
            >
              📥 ইমপোর্ট
            </button>
          </div>
        </div>

        {stories.length === 0 ? (
          <div className={`text-center py-40 border-2 border-dashed rounded-3xl ${isDarkMode ? 'bg-gray-900/50 border-gray-800 text-gray-600' : 'bg-white/50 border-gray-200 text-gray-400'}`}>
            <p className="text-xl">আপনার কোনো গল্প নেই।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stories.map((story) => {
              const isMature = story.maturity === MaturityLevel.MATURE;
              const shouldBlur = isMature && blurMature;
              
              return (
                <div 
                  key={story.id} 
                  className={`group rounded-3xl shadow-md hover:shadow-xl transition-all border overflow-hidden flex flex-col ${
                    isMature 
                      ? (isDarkMode ? 'bg-purple-900/20 border-purple-900/50' : 'bg-purple-50/30 border-purple-100') 
                      : (isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100')
                  }`}
                >
                  <div 
                    className={`h-3 w-full cursor-pointer ${isMature ? 'bg-purple-900' : 'bg-red-900'}`}
                    onClick={() => onSelect(story.id)}
                  />
                  <div className="p-8 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <h3 
                        onClick={() => onSelect(story.id)}
                        className={`text-xl font-bold cursor-pointer line-clamp-1 ${isMature ? 'text-purple-400' : (isDarkMode ? 'text-white' : 'text-red-900')}`}
                      >
                        {story.title}
                      </h3>
                      <button onClick={() => onDelete(story.id)} className={`p-2 transition-colors ${isDarkMode ? 'text-gray-600 hover:text-red-500' : 'text-gray-400 hover:text-red-600'}`}>🗑️</button>
                    </div>
                    
                    <div className={`relative ${shouldBlur ? 'filter blur-sm select-none' : ''}`}>
                      <p className={`line-clamp-3 text-sm leading-relaxed mb-6 font-serif ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {story.content || 'গল্পের কোনো বিষয়বস্তু নেই...'}
                      </p>
                      {shouldBlur && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 font-bold text-xs text-white rounded">
                          MATURE CONTENT HIDDEN
                        </div>
                      )}
                    </div>

                    <div className={`flex items-center justify-between mt-auto pt-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-50'}`}>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${isMature ? 'bg-purple-900 text-white' : (isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-600')}`}>
                          {isMature ? '18+' : 'Safe'}
                        </span>
                        {story.tone && <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-600'}`}>{story.tone}</span>}
                      </div>
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
