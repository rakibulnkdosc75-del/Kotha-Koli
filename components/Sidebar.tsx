
import React from 'react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onNewStory: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onNewStory }) => {
  const menuItems = [
    { id: View.EDITOR, label: 'সম্পাদক (Editor)', icon: '✍️' },
    { id: View.LIBRARY, label: 'লাইব্রেরি (Library)', icon: '📚' },
    { id: View.VOICE_STUDIO, label: 'ভয়েস স্টুডিও (Voice)', icon: '🎙️' },
    { id: View.MEDIA_LAB, label: 'মিডিয়া ল্যাব (Media)', icon: '🎬' },
    { id: View.SETTINGS, label: 'সেটিংস (Settings)', icon: '⚙️' },
  ];

  return (
    <div className="w-64 bg-red-950 text-white flex flex-col border-r border-red-900">
      <div className="p-6 border-b border-red-900">
        <h1 className="text-2xl font-bold text-yellow-500 tracking-wider">কথাকলি</h1>
        <p className="text-xs text-red-300 mt-1 uppercase tracking-tighter">Premium Bengali Studio</p>
      </div>

      <div className="p-4">
        <button 
          onClick={onNewStory}
          className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-inner"
        >
          <span>+</span> নতুন গল্প
        </button>
      </div>

      <nav className="flex-1 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full px-6 py-4 flex items-center gap-4 transition-colors ${
              currentView === item.id 
                ? 'bg-red-900 border-l-4 border-yellow-500 text-yellow-500' 
                : 'hover:bg-red-900/50 text-red-100'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 text-[10px] text-red-400 text-center uppercase tracking-widest border-t border-red-900">
        AI-Powered Narrative Suite
      </div>
    </div>
  );
};

export default Sidebar;
