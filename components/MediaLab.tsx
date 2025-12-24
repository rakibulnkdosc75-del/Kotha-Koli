
import React, { useState } from 'react';
import { Story, StoryAsset, ImageQuality } from '../types';
import { gemini } from '../services/gemini';

interface MediaLabProps {
  story: Story;
  onUpdate: (updates: Partial<Story>) => void;
}

const MediaLab: React.FC<MediaLabProps> = ({ story, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [quality, setQuality] = useState<ImageQuality>('1K');
  const [selectedAsset, setSelectedAsset] = useState<StoryAsset | null>(null);
  const [editPrompt, setEditPrompt] = useState('');

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
      
      // Step 1: Translate/Enhance prompt for visual generator
      const visualPrompt = await gemini.translateToVisualPrompt(videoPromptRaw, story.maturity === 'mature');
      
      // Step 2: Generate Video
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

  const handleEditImage = async () => {
    if (!selectedAsset || !editPrompt) return;
    setIsGenerating(true);
    try {
      const newUrl = await gemini.editImage(selectedAsset.url, editPrompt);
      if (newUrl) {
        onUpdate({ 
          assets: story.assets.map(a => a.id === selectedAsset.id ? { ...a, url: newUrl, prompt: `${a.prompt} (Edited: ${editPrompt})` } : a) 
        });
        setSelectedAsset(null);
        setEditPrompt('');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 p-8 bg-white overflow-hidden flex flex-col">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-red-950">মিডিয়া ল্যাব (Media Lab)</h2>
          <p className="text-gray-600 mt-1">গল্পের জন্য দৃশ্য এবং ভিডিও তৈরি করুন</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('image')}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'image' ? 'bg-red-800 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            ছবি (Images)
          </button>
          <button 
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'video' ? 'bg-red-800 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            ভিডিও (Video)
          </button>
          <button 
            onClick={() => (window as any).aistudio?.openSelectKey()}
            className="px-4 py-2 text-xs font-bold border rounded-lg hover:bg-gray-50 transition-colors ml-4"
          >
            🔑 API কী
          </button>
        </div>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        <div className="w-1/3 space-y-6 overflow-y-auto pr-2">
          {activeTab === 'image' ? (
            <div className="bg-gray-50 p-6 rounded-2xl border">
              <h3 className="font-bold mb-4 flex items-center gap-2">🖼️ নতুন হাই-কোয়ালিটি ছবি</h3>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="গল্পের দৃশ্য বর্ণনা করুন (বাংলায় বা ইংরেজিতে)..."
                className="w-full p-4 rounded-xl border border-gray-300 h-32 mb-4 focus:ring-2 focus:ring-red-200 outline-none"
              />
              
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 block mb-2">কোয়ালিটি (Image Size)</label>
                <div className="flex gap-2">
                  {(['1K', '2K', '4K'] as ImageQuality[]).map(q => (
                    <button 
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${quality === q ? 'bg-red-800 text-white border-red-800' : 'bg-white text-gray-700 border-gray-300'}`}
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
            <div className="bg-gray-50 p-6 rounded-2xl border">
              <h3 className="font-bold mb-4 flex items-center gap-2">🎬 ভিডিও এনিমেশন</h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">গল্পের একটি অংশ ভিডিওতে রূপান্তর করুন। নিচে বর্ণনা দিন অথবা ডানপাশ থেকে একটি ছবি সিলেক্ট করে এনিমেট করুন।</p>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="ভিডিওর জন্য দৃশ্য বর্ণনা দিন..."
                className="w-full p-4 rounded-xl border border-gray-300 h-32 mb-4 focus:ring-2 focus:ring-red-200 outline-none"
              />
              <button 
                onClick={() => createVideo()}
                disabled={isGenerating || (!prompt && !story.content)}
                className="w-full py-3 bg-indigo-700 text-white rounded-xl font-bold hover:bg-indigo-800 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'ভিডিও তৈরি করুন'}
              </button>
            </div>
          )}

          {selectedAsset && selectedAsset.type === 'image' && (
            <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200">
              <h3 className="font-bold mb-4 flex items-center gap-2">🎨 ছবি এডিট করুন</h3>
              <textarea 
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="পরিবর্তন বর্ণনা করুন..."
                className="w-full p-4 rounded-xl border border-yellow-300 h-24 mb-4 outline-none"
              />
              <div className="flex gap-2">
                <button onClick={handleEditImage} className="flex-1 py-3 bg-yellow-600 text-white rounded-xl font-bold">এডিট</button>
                <button onClick={() => setSelectedAsset(null)} className="px-4 py-3 bg-white border border-yellow-300 rounded-xl">বাতিল</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 bg-gray-50 rounded-3xl p-8 border overflow-y-auto">
          <h3 className="font-bold mb-6 text-gray-700 uppercase tracking-wider text-sm">গল্পের মিডিয়া গ্যালারি</h3>
          <div className="grid grid-cols-2 gap-6">
            {story.assets.map((asset) => (
              <div key={asset.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border group relative">
                {asset.type === 'image' ? (
                  <img src={asset.url} className="w-full aspect-video object-cover" alt={asset.prompt} />
                ) : (
                  <video src={asset.url} className="w-full aspect-video object-cover" controls />
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs text-gray-500 line-clamp-1 italic">{asset.prompt}</p>
                    {asset.type === 'image' && asset.quality && <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded">{asset.quality}</span>}
                  </div>
                  <div className="flex gap-2">
                    {asset.type === 'image' && (
                      <>
                        <button onClick={() => setSelectedAsset(asset)} className="flex-1 py-2 text-[10px] font-bold bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">এডিট</button>
                        <button 
                          onClick={() => createVideo(asset)} 
                          disabled={isGenerating}
                          className="flex-1 py-2 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                        >
                          ভিডিও এনিমেশন
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {story.assets.length === 0 && (
              <div className="col-span-2 flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="text-4xl mb-2">📁</div>
                <p>এখনো কোনো মিডিয়া তৈরি করা হয়নি</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isGenerating && (
        <div className="fixed bottom-10 right-10 bg-black/90 text-white px-8 py-6 rounded-3xl shadow-2xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-10">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <div>
            <p className="font-bold text-lg">মিডিয়া তৈরি হচ্ছে...</p>
            <p className="text-xs text-gray-400">ভিডিও তৈরিতে কয়েক মিনিট সময় লাগতে পারে। অনুগ্রহ করে অপেক্ষা করুন।</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLab;
