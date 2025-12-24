
import React, { useState, useRef, useEffect } from 'react';
import { Story, MaturityLevel, StoryTone, AppSettings, StoryAsset } from '../types';
import { gemini } from '../services/gemini';

interface EditorProps {
  story: Story;
  onUpdate: (updates: Partial<Story>) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onNavigateToMedia: () => void;
}

type AIAction = 'write' | 'image' | 'describe';

const Editor: React.FC<EditorProps> = ({ story, onUpdate, settings, onUpdateSettings, onNavigateToMedia }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AIAction>('write');
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const isMatureMode = story.maturity === MaturityLevel.MATURE;
  const isDarkMode = settings.isDarkMode || isMatureMode;

  // Autosave Timer: Triggers every 2 minutes
  useEffect(() => {
    const autosaveInterval = setInterval(() => {
      const now = new Date();
      setLastSaved(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setShowSaveIndicator(true);
      
      setTimeout(() => setShowSaveIndicator(false), 3000);
      console.log("Autosave triggered at", now.toISOString());
    }, 120000);

    return () => clearInterval(autosaveInterval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
      audioSourceRef.current = null;
    }
    setIsReading(false);
  };

  const toggleDarkMode = () => {
    onUpdateSettings({ ...settings, isDarkMode: !settings.isDarkMode });
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const handleToggleSpeech = async () => {
    if (isReading) {
      stopAudio();
      return;
    }

    if (!story.content.trim()) {
      alert("গল্পে কোনো লেখা নেই যা পড়া যাবে।");
      return;
    }

    setIsReading(true);
    try {
      const base64Audio = await gemini.generateSpeech(story.content, story.tone);
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        const audioData = decode(base64Audio);
        const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setIsReading(false);
        
        audioSourceRef.current = source;
        source.start(0);
      } else {
        setIsReading(false);
      }
    } catch (error) {
      console.error(error);
      alert("TTS generation failed. The story might be too long for a single audio generation.");
      setIsReading(false);
    }
  };

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
      const fullContext = `Focusing on the '${story.tone || 'Standard'}' tone, continue this story. Prompt context: ${prompt}. Current content: ${story.content}`;
      const result = await gemini.generateStory(fullContext, story.maturity, story.tone);
      onUpdate({ content: story.content + "\n\n" + result });
      setPrompt('');
    } catch (error: any) {
      console.error(error);
      alert('AI Generation failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDescribeScene = async () => {
    if (!prompt.trim() && !story.content) return;
    setIsGenerating(true);
    try {
      const fullContext = `Provide a vivid, sensory description of this scene to help with my writing. Focus on the atmosphere, environment, and specific sensory details. Context: ${prompt || story.content.slice(-2000)}`;
      const result = await gemini.generateStory(fullContext, story.maturity, story.tone);
      onUpdate({ content: story.content + "\n\n[পারিবেশিক বর্ণনা]: " + result });
      setPrompt('');
    } catch (error: any) {
      console.error(error);
      alert('AI Description failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    const imagePrompt = prompt.trim() || story.content.slice(-1000) || story.title;
    if (!imagePrompt) {
      alert("ছবি তৈরির জন্য কোনো প্রম্পট বা গল্পের কন্টেন্ট নেই।");
      return;
    }

    setIsGenerating(true);
    try {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) await (window as any).aistudio?.openSelectKey();

      const url = await gemini.generateStoryImage(imagePrompt, isMatureMode, settings.defaultImageQuality);
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
      if (!hasKey) await (window as any).aistudio?.openSelectKey();

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

  // Dynamic Theme Classes
  const containerClass = `flex-1 flex flex-col overflow-hidden transition-colors duration-500 ${
    isMatureMode ? 'bg-[#0a050d]' : (isDarkMode ? 'bg-gray-950' : 'bg-white')
  }`;

  const headerClass = `px-8 py-4 border-b flex items-center justify-between transition-colors duration-500 ${
    isMatureMode 
      ? 'bg-[#150a1d] border-purple-900/50' 
      : (isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200')
  }`;

  const sidebarClass = `w-72 border-l overflow-y-auto space-y-4 p-4 transition-colors duration-500 ${
    isMatureMode ? 'bg-[#150a1d] border-purple-900/30' : (isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200')
  }`;

  const toolbarClass = `p-6 border-t shadow-2xl transition-colors duration-500 ${
    isMatureMode 
      ? 'bg-[#150a1d] border-purple-900/50' 
      : (isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100')
  }`;

  return (
    <div className={containerClass}>
      {/* Editor Header */}
      <div className={headerClass}>
        <div className="flex-1 flex items-center gap-4">
          <input 
            type="text"
            value={story.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className={`text-2xl font-bold bg-transparent border-none focus:ring-0 w-full transition-colors ${
              isMatureMode ? 'text-purple-100 placeholder-purple-800' : (isDarkMode ? 'text-gray-100 placeholder-gray-700' : 'text-red-900')
            }`}
            placeholder="গল্পের নাম..."
          />
        </div>
        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleDarkMode}
            className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
              isDarkMode 
                ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={settings.isDarkMode ? "লাইট মোড" : "ডার্ক মোড"}
            disabled={isMatureMode} // Mature mode is always themed dark purple
          >
            {settings.isDarkMode ? <span className="text-lg">☀️</span> : <span className="text-lg">🌙</span>}
          </button>

          <div className="flex flex-col items-end mr-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isMatureMode ? 'text-purple-500' : (isDarkMode ? 'text-gray-500' : 'text-gray-400')}`}>
              {showSaveIndicator ? 'অটোসেভ হচ্ছে...' : `সংরক্ষিত: ${lastSaved}`}
            </span>
            {showSaveIndicator && <div className="h-0.5 w-full bg-green-500 animate-pulse rounded-full mt-1" />}
          </div>

          <button 
            onClick={handleToggleSpeech}
            className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
              isReading 
                ? 'bg-red-600 text-white animate-pulse' 
                : isMatureMode 
                  ? 'bg-purple-900/40 text-purple-400 hover:bg-purple-900' 
                  : (isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
            }`}
            title={isReading ? "পড়া বন্ধ করুন" : "গল্পটি শুনুন"}
          >
            {isReading ? <span className="text-sm">⏹️</span> : <span className="text-lg">🔊</span>}
          </button>

          <select 
            value={story.tone || 'Standard'}
            onChange={(e) => onUpdate({ tone: e.target.value as StoryTone })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold outline-none border transition-colors ${
              isMatureMode 
                ? 'bg-purple-900/20 border-purple-800 text-purple-300' 
                : (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700')
            }`}
          >
            {tones.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${isMatureMode ? 'bg-purple-900 text-purple-300' : 'bg-green-100 text-green-700'}`}>
            {isMatureMode ? '18+ Mature' : 'General'}
          </span>
          <button 
            onClick={onNavigateToMedia}
            className={`p-2 rounded-lg transition-colors ${isMatureMode ? 'text-purple-400 hover:bg-purple-900/40' : (isDarkMode ? 'text-gray-500 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100')}`}
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
          className={`flex-1 p-12 text-lg leading-relaxed focus:ring-0 border-none resize-none font-serif transition-all duration-500 ${
            isMatureMode 
              ? 'text-purple-50 bg-[#0a050d] placeholder-purple-900/40' 
              : (isDarkMode ? 'text-gray-100 bg-gray-950 placeholder-gray-800' : 'text-gray-800 bg-white')
          }`}
          placeholder="আপনার গল্প শুরু করুন..."
        />
        
        {/* Assets Sidebar Preview */}
        {story.assets.length > 0 && (
          <div className={sidebarClass}>
            <h3 className={`font-bold uppercase text-[10px] tracking-[0.2em] ${isMatureMode ? 'text-purple-400' : (isDarkMode ? 'text-gray-600' : 'text-gray-500')}`}>Story Assets</h3>
            {story.assets.map(asset => (
              <div key={asset.id} className={`rounded-2xl overflow-hidden border shadow-sm group relative ${isMatureMode ? 'border-purple-800/50' : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
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
      <div className={toolbarClass}>
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
                  : (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-600 focus:border-gray-500' : 'bg-gray-50 border-gray-200 focus:border-red-500')
              }`}
            />
            
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`px-4 py-3.5 border-y border-r transition-all flex items-center gap-2 text-sm font-bold ${
                  isMatureMode 
                    ? 'bg-purple-900/40 border-purple-800/50 text-purple-200 hover:bg-purple-900' 
                    : (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200')
                }`}
              >
                <span>{currentActionData.icon}</span>
                <span className="hidden sm:inline">▼</span>
              </button>

              {isMenuOpen && (
                <div className={`absolute bottom-full right-0 mb-2 w-56 rounded-2xl shadow-2xl border p-2 z-[100] animate-in fade-in slide-in-from-bottom-2 ${
                  isMatureMode ? 'bg-[#1a0f24] border-purple-800 text-purple-100' : (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-800')
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
                          : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
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
