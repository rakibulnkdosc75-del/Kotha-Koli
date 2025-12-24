
import React, { useState, useEffect, useRef } from 'react';
import { View, MaturityLevel, Story, AppSettings } from './types';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import Library from './components/Library';
import Settings from './components/Settings';
import VoiceStudio from './components/VoiceStudio';
import MediaLab from './components/MediaLab';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.EDITOR);
  const [stories, setStories] = useState<Story[]>(() => {
    try {
      const saved = localStorage.getItem('kothakoli_stories');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [activeStoryId, setActiveStoryId] = useState<string | null>(() => {
    return localStorage.getItem('kothakoli_last_active_id');
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('kothakoli_settings');
      return saved ? JSON.parse(saved) : {
        language: 'Bengali',
        maturityLevel: MaturityLevel.GENERAL,
        isConfirmedAdult: false,
        blurMatureThumbnails: true,
        defaultImageQuality: '1K',
        isDarkMode: false
      };
    } catch (e) {
      return {
        language: 'Bengali',
        maturityLevel: MaturityLevel.GENERAL,
        isConfirmedAdult: false,
        blurMatureThumbnails: true,
        defaultImageQuality: '1K',
        isDarkMode: false
      };
    }
  });

  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      localStorage.setItem('kothakoli_stories', JSON.stringify(stories));
      if (activeStoryId) localStorage.setItem('kothakoli_last_active_id', activeStoryId);
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [stories, activeStoryId]);

  useEffect(() => {
    localStorage.setItem('kothakoli_settings', JSON.stringify(settings));
  }, [settings]);

  const activeStory = stories.find(s => s.id === activeStoryId) || null;

  const handleCreateStory = () => {
    const newStory: Story = {
      id: Date.now().toString(),
      title: 'নতুন গল্প ' + (stories.length + 1),
      content: '',
      genre: 'Drama',
      maturity: settings.maturityLevel,
      tone: 'Standard',
      updatedAt: Date.now(),
      assets: []
    };
    setStories(prev => [newStory, ...prev]);
    setActiveStoryId(newStory.id);
    setCurrentView(View.EDITOR);
  };

  const handleImportStory = (title: string, content: string) => {
    const newStory: Story = {
      id: Date.now().toString(),
      title: title || 'ইমপোর্ট করা গল্প',
      content: content,
      genre: 'Imported',
      maturity: settings.maturityLevel,
      updatedAt: Date.now(),
      assets: []
    };
    setStories(prev => [newStory, ...prev]);
    setActiveStoryId(newStory.id);
    setCurrentView(View.EDITOR);
  };

  const updateStory = (id: string, updates: Partial<Story>) => {
    setStories(prev => prev.map(s => s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s));
  };

  const deleteStory = (id: string) => {
    if (window.confirm("আপনি কি নিশ্চিতভাবে এই গল্পটি মুছে ফেলতে চান?")) {
      setStories(prev => prev.filter(s => s.id !== id));
      if (activeStoryId === id) setActiveStoryId(null);
    }
  };

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-500 font-sans ${settings.isDarkMode ? 'bg-gray-950 text-white' : 'bg-[#fdfbf7] text-gray-900'}`}>
      <Sidebar currentView={currentView} onNavigate={setCurrentView} onNewStory={handleCreateStory} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {currentView === View.EDITOR && activeStory && (
          <Editor 
            key={activeStory.id}
            story={activeStory} 
            onUpdate={(u) => updateStory(activeStory.id, u)} 
            settings={settings}
            onUpdateSettings={updateSettings}
            onNavigateToMedia={() => setCurrentView(View.MEDIA_LAB)}
          />
        )}
        {currentView === View.EDITOR && !activeStory && (
          <div className="flex-1 flex items-center justify-center flex-col space-y-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-800 text-4xl shadow-inner">✍️</div>
            <h2 className={`text-3xl font-bold ${settings.isDarkMode ? 'text-gray-400' : 'text-gray-300'}`}>আপনার গল্প শুরু করুন</h2>
            <button onClick={handleCreateStory} className="px-8 py-4 bg-red-800 text-white rounded-2xl font-bold hover:bg-red-900 transform hover:scale-105 transition-all shadow-xl">নতুন গল্প লিখুন</button>
          </div>
        )}
        {currentView === View.LIBRARY && (
          <Library stories={stories} onSelect={(id) => { setActiveStoryId(id); setCurrentView(View.EDITOR); }} onDelete={deleteStory} onImport={handleImportStory} blurMature={settings.blurMatureThumbnails} isDarkMode={settings.isDarkMode} />
        )}
        {currentView === View.SETTINGS && (
          <Settings settings={settings} onUpdate={setSettings} />
        )}
        {currentView === View.VOICE_STUDIO && (
          <VoiceStudio 
            maturity={settings.maturityLevel}
            onContentGenerated={(content) => {
              if (activeStoryId) {
                const s = stories.find(st => st.id === activeStoryId);
                updateStory(activeStoryId, { content: (s?.content || '') + "\n\n" + content });
              } else {
                const newId = Date.now().toString();
                setStories(prev => [{ id: newId, title: 'ভয়েস গল্প', content, genre: 'Voice', maturity: settings.maturityLevel, updatedAt: Date.now(), assets: [] }, ...prev]);
                setActiveStoryId(newId);
              }
              setCurrentView(View.EDITOR);
            }} 
          />
        )}
        {currentView === View.MEDIA_LAB && activeStory && (
          <MediaLab story={activeStory} onUpdate={(u) => updateStory(activeStory.id, u)} isDarkMode={settings.isDarkMode} />
        )}
        {currentView === View.MEDIA_LAB && !activeStory && (
          <div className={`flex-1 flex items-center justify-center flex-col space-y-4 ${settings.isDarkMode ? 'text-gray-700' : 'text-gray-300'}`}>
            <div className="text-6xl">🎞️</div>
            <p className="text-xl font-medium">দয়া করে প্রথমে একটি গল্প নির্বাচন করুন</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
