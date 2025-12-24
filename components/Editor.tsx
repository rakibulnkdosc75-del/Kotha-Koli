
import React, { useState, useRef, useEffect } from 'react';
import { Story, MaturityLevel, StoryTone, AppSettings, StoryAsset } from '../types';
import { gemini } from '../services/gemini';

interface EditorProps {
  story: Story;
  onUpdate: (updates: Partial<Story>) => void;
  settings: AppSettings;
  onNavigateToMedia: () => void;
}

type AIAction = 'write' | 'image' | 'describe';

const Editor: React.FC<EditorProps> = ({ story, onUpdate, settings, onNavigateToMedia }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AIAction>('write');
  const menuRef = useRef<HTMLDivElement>(null);
  
  const isMatureMode = story.maturity === MaturityLevel.MATURE;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAIDirective = async () => {
    if (selectedAction === 'write') {
      await handleContinueStory();
    } else if (selectedAction === 'image') {
      await handleGenerateImage();
    } else if (selectedAction === 'describe') {
      await handleDescribeScene();
    }
  };

  const handleContinueStory = async () => {
    if (!prompt.trim() && !story.content) return;
    setIsGenerating(true);
    try {
      const result = await gemini.generateStory(
        `Focusing on the '${story.tone || 'Standard'}' tone, continue this story. Prompt context: ${prompt}. Current content: ${story.content}`,
        story.maturity,
        story.tone
      );
      onUpdate({ content: story.content + "\n\n" + result });
      setPrompt('');
    } catch (error) {
      console.error(error);
      alert('AI Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDescribeScene = async () => {
    if (!prompt.trim() && !story.content) return;
    setIsGenerating(true);
    try {
      const result = await gemini.generateStory(
        `Provide a vivid, sensory description of this scene to help with my writing. Focus on the atmosphere, environment, and specific sensory details. Context: ${prompt || story.content.slice(-500)}`,
        story.maturity,
        story.tone
      );
      onUpdate({ content: story.content + "\n\n[পারিবেশিক বর্ণনা]: " + result });
      setPrompt('');
    } catch (error) {
      console.error(error);
      alert('AI Description failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    const imagePrompt = prompt.trim() || story.content.slice(-500) || story.title;
    if (!imagePrompt) {
      alert("ছবি তৈরির জন্য কোনো প্রম্পট বা গল্পের কন্টেন্ট নেই।");
      return;
    }

    setIsGenerating(true); // Re-use the same loader for simplicity in the toolbar
    try {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio?.openSelectKey();
      }

      const url = await gemini.generateStoryImage(
        imagePrompt, 
        isMatureMode, 
        settings.defaultImageQuality
      );

      if (url) {
        const newAsset: StoryAsset = {
          id: Date.now().toString(),
          type: 'image',
          url,
          prompt: imagePrompt,
          quality: settings.defaultImageQuality
        };
        onUpdate({ assets: [newAsset, ...story.assets] });
        setPrompt('');
      }
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found")) {
        await (window as any).aistudio?.openSelectKey();
      } else {
        alert('Image generation failed.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnimateAsset = async (asset: StoryAsset) => {
    setIsAnimating(true);
    try {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio?.openSelectKey();
      }

      const visualPrompt = await gemini.translateToVisualPrompt(asset.prompt, isMatureMode);
      const videoUrl = await gemini.generateVideo(visualPrompt, asset.url);

      if (videoUrl) {
        const videoAsset: StoryAsset = {
          id: Date.now().toString(),
          type: 'video',
          url: videoUrl,
          prompt: visualPrompt
        };
        onUpdate({ assets: [videoAsset, ...story.assets] });
      }
    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found")) {
        await (window as any).aistudio?.openSelectKey();
      } else {
        alert("Video generation failed.");
      }
    } finally {
      setIsAnimating(false);
    }
  };

  const actions = [
    { id: 'write', label: 'গল্প লিখুন (Write)', icon: '🪄', color: isMatureMode ? 'bg-purple-700' : 'bg-red-800' },
    { id: 'image', label: 'দৃশ্য তৈরি (Image)', icon: '🖼️', color: 'bg-indigo-600' },
    { id: 'describe', label: 'পরিবেশ বর্ণনা (Describe)', icon: '✨', color: 'bg-emerald-600' },
  ];

  const currentActionData = actions.find(a => a.id === selectedAction)!;

  const tones: StoryTone[] = isMatureMode 
    ? ['Standard', 'Romantic', 'Erotic', 'Dark', 'Psychological'] 
    : ['Standard', 'Romantic', 'Dark'];

  return (
    <div className={`flex-1 flex flex-col overflow-hidden transition-colors duration-500 ${isMatureMode ? 'bg-[#0a050d]' : 'bg-white'}`}>
      {/* Editor Header */}
      <div className={`px-8 py-4 border-b flex items-center justify-between ${isMatureMode ? 'bg-[#150a1d] border-purple-900/50' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex-1 flex items-center gap-4">
          <input 
            type="text"
            value={story.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className={`text-2xl font-bold bg-transparent border-none focus:ring-0 w-full ${isMatureMode ? 'text-purple-100 placeholder-purple-800' : 'text-red-900'}`}
            placeholder="গল্পের নাম..."
          />
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={story.tone || 'Standard'}
            onChange={(e) => onUpdate({ tone: e.target.value as StoryTone })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold outline-none border transition-colors ${
              isMatureMode 
                ? 'bg-purple-900/20 border-purple-800 text-purple-300' 
                : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            {tones.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${isMatureMode ? 'bg-purple-900 text-purple-300' : 'bg-green-100 text-green-700'}`}>
            {isMatureMode ? '18+ Mature' : 'General'}
          </span>
          <button 
            onClick={onNavigateToMedia}
            className={`p-2 rounded-lg transition-colors ${isMatureMode ? 'text-purple-400 hover:bg-purple-900/40' : 'text-gray-500 hover:bg-gray-100'}`}
            title="Go to Media Lab"
          >
            🎬
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <textarea
          value={story.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          className={`flex-1 p-12 text-lg leading-relaxed focus:ring-0 border-none resize-none font-serif transition-colors duration-500 ${
            isMatureMode ? 'text-purple-50 bg-[#0a050d] placeholder-purple-900/40' : 'text-gray-800 bg-white'
          }`}
          placeholder="আপনার গল্প শুরু করুন..."
        />
        
        {/* Assets Sidebar Preview */}
        {story.assets.length > 0 && (
          <div className={`w-72 border-l overflow-y-auto space-y-4 p-4 ${isMatureMode ? 'bg-[#150a1d] border-purple-900/30' : 'bg-gray-50'}`}>
            <h3 className={`font-bold uppercase text-[10px] tracking-[0.2em] ${isMatureMode ? 'text-purple-400' : 'text-gray-500'}`}>Story Assets</h3>
            {story.assets.map(asset => (
              <div key={asset.id} className={`rounded-2xl overflow-hidden border shadow-sm group relative ${isMatureMode ? 'border-purple-800/50' : 'border-gray-200'}`}>
                {asset.type === 'image' ? (
                  <img src={asset.url} alt={asset.prompt} className="w-full h-36 object-cover" />
                ) : (
                  <video src={asset.url} className="w-full h-36 object-cover" controls />
                )}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <button onClick={onNavigateToMedia} className="text-white text-[10px] font-bold px-4 py-1 border border-white/30 rounded-full hover:bg-white hover:text-black transition-all">গ্যালারিতে দেখুন</button>
                  {asset.type === 'image' && (
                    <button 
                      onClick={() => handleAnimateAsset(asset)}
                      disabled={isAnimating}
                      className="text-white text-[10px] font-bold px-4 py-1 bg-indigo-600 rounded-full hover:bg-indigo-500 transition-all disabled:opacity-50"
                    >
                      {isAnimating ? 'তৈরি হচ্ছে...' : 'এনিমেট (Video)'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Tool Bar */}
      <div className={`p-6 border-t shadow-2xl ${isMatureMode ? 'bg-[#150a1d] border-purple-900/50' : 'bg-white border-gray-100'}`}>
        <div className="max-w-4xl mx-auto flex gap-3 relative">
          <div className="flex-1 flex items-center bg-transparent group">
            <input 
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAIDirective()}
              placeholder={
                selectedAction === 'write' ? "গল্পের পরবর্তী অংশ..." : 
                selectedAction === 'image' ? "দৃশ্য বর্ণনা করুন..." : "পরিবেশের বিশদ বিবরণ..."
              }
              className={`flex-1 px-5 py-3.5 rounded-l-2xl border outline-none transition-all shadow-sm ${
                isMatureMode 
                  ? 'bg-purple-950/20 border-purple-800/50 text-purple-100 placeholder-purple-700/60 focus:border-purple-500' 
                  : 'bg-gray-50 border-gray-200 focus:border-red-500'
              }`}
            />
            
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`px-4 py-3.5 border-y border-r transition-all flex items-center gap-2 text-sm font-bold ${
                  isMatureMode 
                    ? 'bg-purple-900/40 border-purple-800/50 text-purple-200 hover:bg-purple-900' 
                    : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{currentActionData.icon}</span>
                <span className="hidden sm:inline">▼</span>
              </button>

              {isMenuOpen && (
                <div className={`absolute bottom-full right-0 mb-2 w-56 rounded-2xl shadow-2xl border p-2 z-[100] animate-in fade-in slide-in-from-bottom-2 ${
                  isMatureMode ? 'bg-[#1a0f24] border-purple-800 text-purple-100' : 'bg-white border-gray-200 text-gray-800'
                }`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest p-2 opacity-50">AI অ্যাকশন নির্বাচন করুন</div>
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        setSelectedAction(action.id as AIAction);
                        setIsMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${
                        selectedAction === action.id 
                          ? (isMatureMode ? 'bg-purple-700 text-white' : 'bg-red-800 text-white') 
                          : (isMatureMode ? 'hover:bg-purple-900/50' : 'hover:bg-gray-100')
                      }`}
                    >
                      <span className="text-xl">{action.icon}</span>
                      <span className="text-sm font-medium">{action.label.split('(')[0]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={handleAIDirective}
            disabled={isGenerating || isAnimating || (selectedAction !== 'image' && !prompt && !story.content)}
            className={`px-8 py-3.5 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-lg active:scale-95 disabled:scale-100 disabled:opacity-50 min-w-[140px] justify-center text-white ${currentActionData.color}`}
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span className="text-lg">{currentActionData.icon}</span>
                <span>{selectedAction === 'write' ? 'লিখুন' : selectedAction === 'image' ? 'দৃশ্য' : 'বর্ণনা'}</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {isAnimating && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] bg-black/95 text-white p-10 rounded-[40px] shadow-2xl flex flex-col items-center text-center max-w-sm border border-white/10 backdrop-blur-md">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
          <h3 className="text-xl font-bold mb-2">ভিডিও এনিমেশন তৈরি হচ্ছে</h3>
          <p className="text-sm text-gray-400">এতে কয়েক মিনিট সময় লাগতে পারে। অনুগ্রহ করে অপেক্ষা করুন।</p>
        </div>
      )}
    </div>
  );
};

export default Editor;
