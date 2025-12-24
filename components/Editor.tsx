
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [isDictating, setIsDictating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AIAction>('write');
  const [lastSaved, setLastSaved] = useState<string>(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const recognitionRef = useRef<any>(null);

  const isMatureMode = story.maturity === MaturityLevel.MATURE;
  const isDarkMode = settings.isDarkMode || isMatureMode;

  useEffect(() => {
    const autosaveInterval = setInterval(() => {
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setShowSaveIndicator(true);
      setTimeout(() => setShowSaveIndicator(false), 3000);
    }, 60000);
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

  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
      audioSourceRef.current = null;
    }
    setIsReading(false);
  }, []);

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
    if (!story.content.trim()) return;
    setIsReading(true);
    try {
      const base64Audio = await gemini.generateSpeech(story.content, story.tone);
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();
        
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        
        const audioBuffer = await decodeAudioData(bytes, ctx, 24000, 1);
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
      setIsReading(false);
    }
  };

  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("দুঃখিত, আপনার ব্রাউজারে স্পিচ রিকগনিশন সাপোর্ট করে না। অনুগ্রহ করে ক্রোম ব্যবহার করুন।");
      return;
    }
    if (isDictating) {
      recognitionRef.current?.stop();
      return;
    }
    setIsDictating(true);
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'bn-BD';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onUpdate({ content: story.content + (story.content ? " " : "") + finalTranscript });
      }
    };
    recognition.onend = () => setIsDictating(false);
    recognition.onerror = () => setIsDictating(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleAIDirective = async () => {
    if (selectedAction === 'write') await handleContinueStory();
    else if (selectedAction === 'image') await handleGenerateImage();
    else if (selectedAction === 'describe') await handleDescribeScene();
  };

  const handleContinueStory = async () => {
    if (!prompt.trim() && !story.content) return;
    setIsGenerating(true);
    try {
      const fullContext = `Instruction: ${prompt}. Current Narrative Flow: ${story.content}`;
      const result = await gemini.generateStory(fullContext, story.maturity, story.tone, settings.language);
      onUpdate({ content: story.content + (story.content ? "\n\n" : "") + result });
      setPrompt('');
    } catch (error: any) {
      alert(error.message || 'AI জেনারেশন ব্যর্থ হয়েছে। সম্ভবত লেখাটি খুব দীর্ঘ বা সুরক্ষিত কন্টেন্ট ফিল্টার করা হয়েছে।');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDescribeScene = async () => {
    if (!prompt.trim() && !story.content) return;
    setIsGenerating(true);
    try {
      const context = `Provide a vivid, sensory atmospheric description based on: ${prompt || story.content.slice(-2000)}`;
      const result = await gemini.generateStory(context, story.maturity, story.tone, settings.language);
      onUpdate({ content: story.content + "\n\n[পরিবেশ বর্ণনা]: " + result });
      setPrompt('');
    } catch (error: any) {
      alert(error.message || 'বর্ণনা তৈরি করা সম্ভব হয়নি।');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    const imagePrompt = prompt.trim() || story.content.slice(-1000) || story.title;
    if (!imagePrompt) return;
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
    } catch (error) {
      alert('ছবি জেনারেট করা সম্ভব হয়নি। অনুগ্রহ করে আপনার API কী চেক করুন।');
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
        onUpdate({ assets: [{ id: Date.now().toString(), type: 'video', url: videoUrl, prompt: visualPrompt }, ...story.assets] });
      }
    } catch (error) {
      alert("ভিডিও এনিমেশন ব্যর্থ হয়েছে।");
    } finally {
      setIsAnimating(false);
    }
  };

  const tones: StoryTone[] = isMatureMode 
    ? ['Standard', 'Romantic', 'Erotic', 'Dark', 'Psychological'] 
    : ['Standard', 'Romantic', 'Dark'];

  return (
    <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-500 ${isMatureMode ? 'bg-[#0a050d]' : (isDarkMode ? 'bg-gray-950' : 'bg-white')}`}>
      {/* Premium Header */}
      <div className={`px-8 py-5 border-b flex items-center justify-between transition-colors duration-500 ${isMatureMode ? 'bg-[#150a1d] border-purple-900/40' : (isDarkMode ? 'bg-gray-900 border-gray-800 shadow-sm' : 'bg-white border-gray-100 shadow-sm')}`}>
        <div className="flex-1 flex items-center gap-4">
          <input 
            type="text"
            value={story.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className={`text-2xl font-bold bg-transparent border-none focus:ring-0 w-full transition-colors ${isMatureMode ? 'text-purple-100' : (isDarkMode ? 'text-red-900' : 'text-red-900')}`}
            placeholder="গল্পের নাম..."
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end px-3 border-r border-current opacity-20">
            <span className="text-[9px] font-bold uppercase tracking-widest">{showSaveIndicator ? 'Saving...' : `Last Saved ${lastSaved}`}</span>
          </div>
          
          <button onClick={startDictation} className={`p-3 rounded-2xl transition-all ${isDictating ? 'bg-red-600 text-white animate-pulse' : (isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}`} title="ভয়েস ডিক্টেশন">🎤</button>
          
          <button onClick={handleToggleSpeech} className={`p-3 rounded-2xl transition-all ${isReading ? 'bg-red-600 text-white animate-pulse shadow-lg' : (isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}`} title="গল্পটি শুনুন">🔊</button>
          
          <select 
            value={story.tone || 'Standard'}
            onChange={(e) => onUpdate({ tone: e.target.value as StoryTone })}
            className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none transition-colors ${isMatureMode ? 'bg-purple-900/30 border-purple-800 text-purple-300' : (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700')}`}
          >
            {tones.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          
          <button onClick={onNavigateToMedia} className="p-3 rounded-2xl hover:bg-black/5 transition-all" title="Media Lab">🎬</button>
        </div>
      </div>

      {/* Writing Area */}
      <div className="flex-1 flex overflow-hidden">
        <textarea
          value={story.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          className={`flex-1 p-12 text-xl leading-[1.8] focus:ring-0 border-none resize-none font-serif transition-all duration-500 selection:bg-red-200 ${isMatureMode ? 'text-purple-50 bg-[#0a050d]' : (isDarkMode ? 'text-gray-100 bg-gray-950' : 'text-gray-800 bg-white')}`}
          placeholder="আপনার নতুন মহাকাব্য এখানে শুরু করুন..."
        />
        
        {story.assets.length > 0 && (
          <div className={`w-80 border-l overflow-y-auto p-5 transition-colors ${isMatureMode ? 'bg-[#150a1d] border-purple-900/30' : (isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200')}`}>
            <h3 className="font-bold uppercase text-[9px] tracking-[0.3em] opacity-40 mb-6">Gallery Preview</h3>
            <div className="space-y-6">
              {story.assets.map(asset => (
                <div key={asset.id} className="rounded-2xl overflow-hidden border shadow-sm group relative hover:scale-[1.02] transition-transform">
                  {asset.type === 'image' ? <img src={asset.url} alt={asset.prompt} className="w-full h-44 object-cover" /> : <video src={asset.url} className="w-full h-44 object-cover" controls />}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                    <button onClick={onNavigateToMedia} className="text-white text-[10px] font-bold px-6 py-2 border border-white/20 rounded-full hover:bg-white hover:text-black">Open Lab</button>
                    {asset.type === 'image' && (
                      <button onClick={() => handleAnimateAsset(asset)} disabled={isAnimating} className="text-white text-[10px] font-bold px-6 py-2 bg-indigo-600 rounded-full">Animate</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Bar */}
      <div className={`p-8 border-t transition-colors ${isMatureMode ? 'bg-[#150a1d] border-purple-900/50' : (isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-2xl')}`}>
        <div className="max-w-4xl mx-auto flex gap-4 relative items-center">
          <div className="flex-1 flex items-center bg-transparent relative">
            <input 
              type="text" 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAIDirective()}
              placeholder={selectedAction === 'write' ? "গল্পের জন্য দিকনির্দেশ দিন..." : "দৃশ্য বর্ণনা করুন..."}
              className={`flex-1 px-6 py-4 rounded-2xl border outline-none transition-all shadow-sm pr-16 ${isMatureMode ? 'bg-purple-950/20 border-purple-800/50 text-purple-100 placeholder-purple-800 focus:border-purple-500' : (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-600 focus:border-gray-500' : 'bg-gray-50 border-gray-200 focus:border-red-500')}`}
            />
            <div className="absolute right-4" ref={menuRef}>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-black/5 text-xl">
                {actions.find(a => a.id === selectedAction)?.icon}
              </button>
              {isMenuOpen && (
                <div className={`absolute bottom-full right-0 mb-4 w-60 rounded-3xl shadow-2xl border p-2 z-[100] animate-in fade-in slide-in-from-bottom-2 ${isMatureMode ? 'bg-[#1a0f24] border-purple-800' : (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-800')}`}>
                  {actions.map((action) => (
                    <button key={action.id} onClick={() => { setSelectedAction(action.id as AIAction); setIsMenuOpen(false); }} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-colors ${selectedAction === action.id ? (isMatureMode ? 'bg-purple-700 text-white' : 'bg-red-800 text-white') : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')}`}>
                      <span className="text-2xl">{action.icon}</span>
                      <span className="text-sm font-bold">{action.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={handleAIDirective} disabled={isGenerating || isAnimating} className={`px-10 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-50 text-white ${actions.find(a => a.id === selectedAction)?.color}`}>
            {isGenerating ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <span>জেনারেশন</span>}
          </button>
        </div>
      </div>

      {/* Processing Overlays */}
      {(isAnimating || isGenerating) && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-xl flex items-center justify-center">
          <div className="bg-gray-950 text-white p-16 rounded-[60px] shadow-2xl border border-white/10 flex flex-col items-center text-center max-w-sm">
            <div className="w-24 h-24 relative mb-10">
              <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-red-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl">🎨</div>
            </div>
            <h3 className="text-3xl font-bold mb-4">শিল্প সৃষ্টি হচ্ছে</h3>
            <p className="text-gray-400 text-sm leading-relaxed">আপনার কল্পনার জগৎ ফুটিয়ে তোলার কাজ চলছে। অনুগ্রহ করে ধৈর্য ধরুন।</p>
          </div>
        </div>
      )}
    </div>
  );
};

const actions = [
  { id: 'write', label: 'গল্প লিখুন', icon: '🪄', color: 'bg-red-800' },
  { id: 'image', label: 'দৃশ্য তৈরি', icon: '🖼️', color: 'bg-indigo-600' },
  { id: 'describe', label: 'পরিবেশ বর্ণনা', icon: '✨', color: 'bg-emerald-600' },
];

export default Editor;
