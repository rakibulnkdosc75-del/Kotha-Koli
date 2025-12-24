
import React from 'react';
import { Story, MaturityLevel } from '../types';

interface LibraryProps {
  stories: Story[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const Library: React.FC<LibraryProps> = ({ stories, onSelect, onDelete }) => {
  return (
    <div className="flex-1 p-10 bg-[#fdfbf7] overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-4xl font-bold text-red-950">আমার লাইব্রেরি (My Library)</h2>
            <p className="text-gray-600 mt-2">আপনার সকল সৃষ্টি এখানে সংরক্ষিত আছে</p>
          </div>
        </div>

        {stories.length === 0 ? (
          <div className="text-center py-40 border-2 border-dashed border-gray-200 rounded-3xl">
            <p className="text-gray-400 text-xl">আপনার কোনো গল্প নেই। একটি নতুন গল্প লিখে শুরু করুন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stories.map((story) => (
              <div 
                key={story.id} 
                className="group bg-white rounded-3xl shadow-md hover:shadow-xl transition-all border border-gray-100 overflow-hidden flex flex-col"
              >
                <div 
                  className="h-3 bg-red-900 w-full cursor-pointer"
                  onClick={() => onSelect(story.id)}
                />
                <div className="p-8 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <h3 
                      onClick={() => onSelect(story.id)}
                      className="text-xl font-bold text-red-900 group-hover:text-red-700 cursor-pointer"
                    >
                      {story.title}
                    </h3>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(story.id); }}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                      title="Delete story"
                    >
                      🗑️
                    </button>
                  </div>
                  <p className="text-gray-600 line-clamp-3 text-sm leading-relaxed mb-6 font-serif">
                    {story.content || 'গল্পের কোনো বিষয়বস্তু নেই...'}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${story.maturity === MaturityLevel.MATURE ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {story.maturity === MaturityLevel.MATURE ? '18+' : 'Safe'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(story.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
