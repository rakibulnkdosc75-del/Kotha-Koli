
import React, { useState } from 'react';
import { Story, StoryAsset } from '../types';
import { gemini } from '../services/gemini';

interface MediaLabProps {
  story: Story;
  onUpdate: (updates: Partial<Story>) => void;
}

const MediaLab: React.FC<MediaLabProps> = ({ story, onUpdate }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<StoryAsset | null>(null);
  const [editPrompt, setEditPrompt] = useState('');

  const generateImage = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const url = await gemini.generateStoryImage(prompt);
      if (url) {
        const newAsset: StoryAsset = {
          id: Date.now().toString(),
          type: 'image',
          url,
          prompt
        };
        onUpdate({ assets: [newAsset, ...story.assets] });
        setPrompt('');
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

  const animateImage = async (asset: StoryAsset) => {
    setIsGenerating(true);
    try {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio?.openSelectKey();
      }
      
      const videoUrl = await gemini.generateVideoFromImage(asset.url, `Animate this scene: ${asset.prompt}`);
      if (videoUrl) {
        const videoAsset: StoryAsset = {
          id: Date.now().toString(),
          type: 'video',
          url: videoUrl,
          prompt: `Animation of: ${asset.prompt}`
        };
        onUpdate({ assets: [videoAsset, ...story.assets] });
      }
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        alert("Please select a valid paid API key for Veo generation.");
        await (window as any).aistudio?.openSelectKey();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 p-8 bg-white overflow-hidden flex flex-col">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-red-950">মিডিয়া ল্যাব (Media Lab)</h2>
        <p className="text-gray-600 mt-1">গল্পের জন্য দৃশ্য এবং ভিডিও তৈরি করুন</p>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Creation Form */}
        <div className="w-1/3 space-y-6">
          <div className="bg-gray-50 p-6 rounded-2xl border">
            <h3 className="font-bold mb-4 flex items-center gap-2">🖼️ নতুন ছবি তৈরি করুন</h3>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="দৃশ্য বর্ণনা করুন (যেমন: 'সূর্যাস্তের সময় নদীর পাড়ে একটি গ্রাম্য দৃশ্য')..."
              className="w-full p-4 rounded-xl border border-gray-300 h-32 mb-4 focus:ring-2 focus:ring-red-200 outline-none"
            />
            <button 
              onClick={generateImage}
              disabled={isGenerating || !prompt}
              className="w-full py-3 bg-red-800 text-white rounded-xl font-bold hover:bg-red-900 disabled:bg-gray-400 transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? 'জেনারেট হচ্ছে...' : 'জেনারেট করুন'}
            </button>
          </div>

          {selectedAsset && selectedAsset.type === 'image' && (
            <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="font-bold mb-4 flex items-center gap-2">🎨 ছবি এডিট করুন</h3>
              <p className="text-xs text-yellow-700 mb-2 italic">নির্বাচিত: {selectedAsset.prompt.slice(0, 30)}...</p>
              <textarea 
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="পরিবর্তন বর্ণনা করুন (যেমন: 'ব্যাকগ্রাউন্ডে একটি পাহাড় যোগ করুন' বা 'বিকেলের আলো দিন')..."
                className="w-full p-4 rounded-xl border border-yellow-300 h-24 mb-4 focus:ring-2 focus:ring-yellow-200 outline-none"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleEditImage}
                  disabled={isGenerating || !editPrompt}
                  className="flex-1 py-3 bg-yellow-600 text-white rounded-xl font-bold hover:bg-yellow-700 disabled:bg-gray-400 transition-all"
                >
                  এডিট করুন
                </button>
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="px-4 py-3 bg-white border border-yellow-300 rounded-xl text-yellow-700 font-medium hover:bg-yellow-100"
                >
                  বাতিল
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Assets Gallery */}
        <div className="flex-1 bg-gray-50 rounded-3xl p-8 border overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            {story.assets.map((asset) => (
              <div key={asset.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border group relative">
                {asset.type === 'image' ? (
                  <img src={asset.url} className="w-full aspect-video object-cover" alt={asset.prompt} />
                ) : (
                  <video src={asset.url} className="w-full aspect-video object-cover" controls />
                )}
                
                <div className="p-4">
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{asset.prompt}</p>
                  <div className="flex gap-2">
                    {asset.type === 'image' && (
                      <>
                        <button 
                          onClick={() => setSelectedAsset(asset)}
                          className="flex-1 py-2 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          এডিট
                        </button>
                        <button 
                          onClick={() => animateImage(asset)}
                          className="flex-1 py-2 text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
                        >
                          ভিডিও তৈরি (Veo)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {story.assets.length === 0 && (
              <div className="col-span-2 flex flex-col items-center justify-center py-20 text-gray-400">
                <span className="text-5xl mb-4">🖼️</span>
                <p>এখনও কোনো মিডিয়া তৈরি করা হয়নি</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaLab;
