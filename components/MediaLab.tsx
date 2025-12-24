
import React, { useState } from 'react';
import { Story, StoryAsset, ImageQuality } from '../types';
import { gemini } from '../services/gemini';

interface MediaLabProps {
  story: Story;
  onUpdate: (updates: Partial<Story>) => void;
  isDarkMode: boolean;
}

const MediaLab: React.FC<MediaLabProps> = ({ story, onUpdate, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [quality, setQuality] = useState<ImageQuality>('1K');
  const [selectedAsset, setSelectedAsset] = useState<StoryAsset | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [activeTool, setActiveTool] = useState<'none' | 'filter' | 'remove' | 'manual'>('none');
  const [objectToRemove, setObjectToRemove] = useState('');

  const ensureApiKey = async () => {
    const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio?.openSelectKey();
    }
  };

  const generateImage = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      await ensureApiKey();
      const url = await gemini.generateStoryImage(prompt, story.maturity === 'mature', quality);
      if (url) {
        const newAsset: StoryAsset = {
          id: Date.now().toString(),
          type: 'image',
          url,
          prompt,
          quality
        };
        onUpdate({ assets: [newAsset, ...story.assets] });
        setPrompt('');
      }
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        await (window as any).aistudio?.openSelectKey();
      } else {
        alert("Generation failed. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const createVideo = async (sourceAsset?: StoryAsset) => {
    const videoPromptRaw = prompt || (sourceAsset ? sourceAsset.prompt : story.content.slice(-300));
    if (!videoPromptRaw) return;

    setIsGenerating(true);
    try {
      await ensureApiKey();
      const visualPrompt = await gemini.translateToVisualPrompt(videoPromptRaw, story.maturity === 'mature');
      const videoUrl = await gemini.generateVideo(visualPrompt, sourceAsset?.url);
      
      if (videoUrl) {
        const newAsset: StoryAsset = {
          id: Date.now().toString(),
          type: 'video',
          url: videoUrl,
          prompt: visualPrompt
        };
        onUpdate({ assets: [newAsset, ...story.assets] });
        setPrompt('');
      }
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        await (window as any).aistudio?.openSelectKey();
      } else {
        alert("Video generation failed. Note: This can take several minutes.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditImage = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || editPrompt;
    if (!selectedAsset || !finalPrompt) return;
    
    setIsGenerating(true);
    try {
      const newUrl = await gemini.editImage(selectedAsset.url, finalPrompt);
      if (newUrl) {
        onUpdate({ 
          assets: story.assets.map(a => a.id === selectedAsset.id ? { ...a, url: newUrl, prompt: `${a.prompt} (Modified: ${finalPrompt})` } : a) 
        });
        setSelectedAsset(null);
        setEditPrompt('');
        setObjectToRemove('');
        setActiveTool('none');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const quickFilters = [
    { name: 'Enhance', icon: '🪄', prompt: 'Auto enhance colors, improve lighting, contrast, and overall clarity' },
    { name: 'Cinematic', icon: '🎬', prompt: 'Apply a cinematic color grade with moody lighting and professional film look' },
    { name: 'Vintage', icon: '🎞️', prompt: 'Apply a vintage film grain effect with warm sepia tones and slight edge wear' },
    { name: 'B&W', icon: '🌑', prompt: 'Convert to a high-contrast black and white fine art photography style' },
    { name: 'Midnight', icon: '🌃', prompt: 'Apply a deep blue night-time atmosphere with glowing highlights' },
  ];

  const cardClass = `p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`;
  const textareaClass = `w-full p-4 rounded-xl border outline-none transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:border-red-500' : 'bg-white border-gray-300 focus:ring-2 focus:ring-red-200'}`;

  return (
    <div className={`flex-1 p-8 overflow-hidden flex flex-col transition-colors duration-500 ${isDarkMode ? 'bg-gray-950' : 'bg-white'}`}>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-red-950'}`}>মিডিয়া ল্যাব (Media Lab)</h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>গল্পের জন্য দৃশ্য এবং ভিডিও তৈরি করুন</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('image')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'image' ? 'bg-red-800 text-white' : (isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600')}`}
          >
            ছবি (Images)
          </button>
          <button 
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'video' ? 'bg-red-800 text-white' : (isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600')}`}
          >
            ভিডিও (Video)
          </button>
          <button 
            onClick={() => (window as any).aistudio?.openSelectKey()}
            className={`px-4 py-2 text-xs font-bold border rounded-lg transition-colors ml-4 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
          >
            🔑 API কী
          </button>
        </div>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        <div className="w-1/3 space-y-6 overflow-y-auto pr-2">
          {/* Main Controls Panel */}
          {!selectedAsset ? (
            activeTab === 'image' ? (
              <div className={cardClass}>
                <h3 className="font-bold mb-4 flex items-center gap-2">🖼️ নতুন হাই-কোয়ালিটি ছবি</h3>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="গল্পের দৃশ্য বর্ণনা করুন (বাংলায় বা ইংরেজিতে)..."
                  className={textareaClass + " h-32 mb-4"}
                />
                
                <div className="mb-4">
                  <label className="text-xs font-bold opacity-60 block mb-2">কোয়ালিটি (Image Size)</label>
                  <div className="flex gap-2">
                    {(['1K', '2K', '4K'] as ImageQuality[]).map(q => (
                      <button 
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${quality === q ? 'bg-red-800 text-white border-red-800' : (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white text-gray-700 border-gray-300')}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={generateImage}
                  disabled={isGenerating || !prompt}
                  className="w-full py-3 bg-red-800 text-white rounded-xl font-bold hover:bg-red-900 disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'জেনারেট করুন'}
                </button>
              </div>
            ) : (
              <div className={cardClass}>
                <h3 className="font-bold mb-4 flex items-center gap-2">🎬 ভিডিও এনিমেশন</h3>
                <p className="text-xs opacity-60 mb-4 leading-relaxed">গল্পের একটি অংশ ভিডিওতে রূপান্তর করুন। নিচে বর্ণনা দিন অথবা ডানপাশ থেকে একটি ছবি সিলেক্ট করে এনিমেট করুন।</p>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="ভিডিওর জন্য দৃশ্য বর্ণনা দিন..."
                  className={textareaClass + " h-32 mb-4"}
                />
                <button 
                  onClick={() => createVideo()}
                  disabled={isGenerating || (!prompt && !story.content)}
                  className="w-full py-3 bg-indigo-700 text-white rounded-xl font-bold hover:bg-indigo-800 disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'ভিডিও তৈরি করুন'}
                </button>
              </div>
            )
          ) : (
            /* Advanced Editing Panel */
            <div className={`${cardClass} animate-in fade-in slide-in-from-left-4`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg flex items-center gap-2">🎨 ক্রিয়েটিভ এডিটর</h3>
                <button onClick={() => { setSelectedAsset(null); setActiveTool('none'); }} className="text-xs opacity-60 hover:opacity-100">বন্ধ করুন</button>
              </div>

              <div className="space-y-4">
                {/* Auto Filters */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-3">কুইক ফিল্টার (Filters)</label>
                  <div className="grid grid-cols-5 gap-2">
                    {quickFilters.map(filter => (
                      <button 
                        key={filter.name}
                        onClick={() => handleEditImage(filter.prompt)}
                        disabled={isGenerating}
                        className={`aspect-square flex flex-col items-center justify-center rounded-xl border text-xl transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                        title={filter.name}
                      >
                        {filter.icon}
                        <span className="text-[8px] mt-1 font-bold">{filter.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Tools */}
                <div className="pt-4 space-y-2">
                  <button 
                    onClick={() => setActiveTool(activeTool === 'remove' ? 'none' : 'remove')}
                    className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${activeTool === 'remove' ? 'bg-red-800 border-red-800 text-white' : (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700')}`}
                  >
                    <span className="text-xl">🧽</span>
                    <div className="text-left">
                      <p className="text-sm font-bold">অবজেক্ট রিমুভাল (Remove Object)</p>
                      <p className="text-[10px] opacity-60">ছবি থেকে অপ্রয়োজনীয় কিছু মুছে ফেলুন</p>
                    </div>
                  </button>

                  {activeTool === 'remove' && (
                    <div className="p-4 bg-black/10 rounded-xl space-y-3">
                      <input 
                        type="text"
                        value={objectToRemove}
                        onChange={(e) => setObjectToRemove(e.target.value)}
                        placeholder="কি মুছতে চান? (উদাঃ 'একটি গাছ')"
                        className={`${textareaClass} p-3 text-sm`}
                      />
                      <button 
                        onClick={() => handleEditImage(`Carefully remove the following object from the image and realistically reconstruct the background: ${objectToRemove}`)}
                        disabled={!objectToRemove || isGenerating}
                        className="w-full py-2 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                      >
                        রিমুভ করুন
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setActiveTool(activeTool === 'manual' ? 'none' : 'manual')}
                    className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${activeTool === 'manual' ? 'bg-red-800 border-red-800 text-white' : (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700')}`}
                  >
                    <span className="text-xl">✍️</span>
                    <div className="text-left">
                      <p className="text-sm font-bold">ম্যানুয়াল এডিট (Custom Edit)</p>
                      <p className="text-[10px] opacity-60">নিজের মত লিখে পরিবর্তন করুন</p>
                    </div>
                  </button>

                  {activeTool === 'manual' && (
                    <div className="p-4 bg-black/10 rounded-xl space-y-3">
                      <textarea 
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="পরিবর্তন বর্ণনা করুন..."
                        className={`${textareaClass} p-3 text-sm h-20`}
                      />
                      <button 
                        onClick={() => handleEditImage()}
                        disabled={!editPrompt || isGenerating}
                        className="w-full py-2 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                      >
                        এডিট প্রয়োগ করুন
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gallery Panel */}
        <div className={`flex-1 rounded-3xl p-8 border overflow-y-auto transition-colors ${isDarkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`font-bold uppercase tracking-wider text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>গল্পের মিডিয়া গ্যালারি</h3>
            <span className="text-[10px] opacity-50 px-3 py-1 bg-black/10 rounded-full">{story.assets.length} Assets</span>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            {story.assets.map((asset) => (
              <div 
                key={asset.id} 
                className={`rounded-2xl overflow-hidden shadow-sm border group relative transition-all cursor-pointer ${
                  selectedAsset?.id === asset.id 
                    ? 'ring-4 ring-red-800 border-transparent scale-[0.98]' 
                    : (isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100')
                }`}
                onClick={() => asset.type === 'image' && setSelectedAsset(asset)}
              >
                {asset.type === 'image' ? (
                  <img src={asset.url} className="w-full aspect-video object-cover" alt={asset.prompt} />
                ) : (
                  <video src={asset.url} className="w-full aspect-video object-cover" controls />
                )}
                
                <div className={`p-4 ${selectedAsset?.id === asset.id ? (isDarkMode ? 'bg-red-900/20' : 'bg-red-50') : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <p className={`text-[10px] italic line-clamp-1 flex-1 pr-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{asset.prompt}</p>
                    {asset.type === 'image' && asset.quality && <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{asset.quality}</span>}
                  </div>
                  
                  <div className="flex gap-2">
                    {asset.type === 'image' ? (
                      <button 
                        className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg transition-colors ${
                          selectedAsset?.id === asset.id 
                            ? 'bg-red-800 text-white' 
                            : (isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                        }`}
                      >
                        {selectedAsset?.id === asset.id ? 'সম্পাদনা চলছে' : 'সম্পাদনা করুন (AI Edit)'}
                      </button>
                    ) : (
                      <span className="text-[9px] font-bold text-indigo-500 px-2 py-1 bg-indigo-50 rounded-lg">ভিডিও ফাইল</span>
                    )}
                  </div>
                </div>
                
                {/* Selection Overlay */}
                {selectedAsset?.id === asset.id && (
                  <div className="absolute top-2 right-2 bg-red-800 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    ✓
                  </div>
                )}
              </div>
            ))}
            
            {story.assets.length === 0 && (
              <div className="col-span-2 flex flex-col items-center justify-center py-24 text-gray-400">
                <div className="text-6xl mb-4 opacity-20">📁</div>
                <p className="font-medium">এখনো কোনো মিডিয়া তৈরি করা হয়নি</p>
                <p className="text-xs opacity-60 mt-2">গল্পের জন্য দৃশ্য বা ভিডিও তৈরি করতে বাম পাশের প্যানেল ব্যবহার করুন</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isGenerating && (
        <div className="fixed bottom-10 right-10 bg-black/95 text-white px-8 py-6 rounded-3xl shadow-2xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-10 border border-white/10 backdrop-blur-md">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <div>
            <p className="font-bold text-lg">AI প্রসেসিং চলছে...</p>
            <p className="text-xs text-gray-400">আপনার দৃশ্যটি নিখুঁত করার জন্য অপেক্ষা করুন। এতে কয়েক মিনিট সময় লাগতে পারে।</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLab;
