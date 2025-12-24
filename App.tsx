
import React, { useState, useEffect } from 'react';
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
    const saved = localStorage.getItem('kothakoli_stories');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('kothakoli_settings');
    return saved ? JSON.parse(saved) : {
      language: 'Bengali',
      maturityLevel: MaturityLevel.GENERAL
    };
  });

  useEffect(() => {
    localStorage.setItem('kothakoli_stories', JSON.stringify(stories));
  }, [stories]);

  useEffect(() => {
    localStorage.setItem('kothakoli_settings', JSON.stringify(settings));
  }, [settings]);

  const activeStory = stories.find(s => s.id === activeStoryId) || null;

  const handleCreateStory = () => {
    const newStory: Story = {
      id: Date.now().toString(),
      title: 'নতুন গল্প (New Story)',
      content: '',
      genre: 'Drama',
      maturity: settings.maturityLevel,
      updatedAt: Date.now(),
      assets: []
    };
    setStories([newStory, ...stories]);
    setActiveStoryId(newStory.id);
    setCurrentView(View.EDITOR);
  };

  const updateStory = (id: string, updates: Partial<Story>) => {
    setStories(prev => prev.map(s => s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s));
  };

  const deleteStory = (id: string) => {
    setStories(prev => prev.filter(s => s.id !== id));
    if (activeStoryId === id) setActiveStoryId(null);
  };

  return (
    <div className="flex h-screen bg-[#fdfbf7] text-gray-900 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        onNewStory={handleCreateStory} 
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {currentView === View.EDITOR && activeStory && (
          <Editor 
            story={activeStory} 
            onUpdate={(updates) => updateStory(activeStory.id, updates)} 
            maturity={settings.maturityLevel}
          />
        )}
        {currentView === View.EDITOR && !activeStory && (
          <div className="flex-1 flex items-center justify-center flex-col space-y-4">
            <h2 className="text-3xl font-bold text-gray-400">আপনার গল্প শুরু করুন</h2>
            <button 
              onClick={handleCreateStory}
              className="px-6 py-3 bg-red-800 text-white rounded-lg shadow-lg hover:bg-red-900 transition-colors"
            >
              নতুন গল্প লিখুন
            </button>
          </div>
        )}
        {currentView === View.LIBRARY && (
          <Library 
            stories={stories} 
            onSelect={(id) => { setActiveStoryId(id); setCurrentView(View.EDITOR); }} 
            onDelete={deleteStory}
          />
        )}
        {currentView === View.SETTINGS && (
          <Settings settings={settings} onUpdate={setSettings} />
        )}
        {currentView === View.VOICE_STUDIO && (
          <VoiceStudio onContentGenerated={(content) => {
             // If active story, append. Else create.
             if (activeStoryId) {
                const s = stories.find(st => st.id === activeStoryId);
                if (s) updateStory(s.id, { content: s.content + "\n" + content });
             } else {
                const newId = Date.now().toString();
                setStories([{
                  id: newId,
                  title: 'ভয়েস গল্প (Voice Story)',
                  content,
                  genre: 'Voice',
                  maturity: settings.maturityLevel,
                  updatedAt: Date.now(),
                  assets: []
                }, ...stories]);
                setActiveStoryId(newId);
             }
             setCurrentView(View.EDITOR);
          }} />
        )}
        {currentView === View.MEDIA_LAB && activeStory && (
          <MediaLab story={activeStory} onUpdate={(updates) => updateStory(activeStory.id, updates)} />
        )}
        {currentView === View.MEDIA_LAB && !activeStory && (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            দয়া করে প্রথমে একটি গল্প নির্বাচন করুন
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
