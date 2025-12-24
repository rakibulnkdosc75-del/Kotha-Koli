
import React, { useState } from 'react';
import { Story, MaturityLevel } from '../types';
import { gemini } from '../services/gemini';

interface EditorProps {
  story: Story;
  onUpdate: (updates: Partial<Story>) => void;
  maturity: MaturityLevel;
}

const Editor: React.FC<EditorProps> = ({ story, onUpdate, maturity }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleAIDirective = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const result = await gemini.generateStory(
        `Continue or refine this story based on: ${prompt}. Current content: ${story.content}`,
        maturity
      );
      onUpdate({ content: story.content + "\n\n" + result });
      setPrompt('');
    } catch (error) {
      console.error(error);
      alert('AI Generation failed. Please check your connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Editor Header */}
      <div className="px-8 py-4 border-b flex items-center justify-between bg-gray-50">
        <input 
          type="text"
          value={story.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="text-2xl font-bold bg-transparent border-none focus:ring-0 w-full text-red-900"
          placeholder="গল্পের নাম..."
        />
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${maturity === MaturityLevel.MATURE ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {maturity === MaturityLevel.MATURE ? '18+ (Mature)' : 'General'}
          </span>
          <span className="text-sm text-gray-500 italic">
            Saved {new Date(story.updatedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <textarea
          value={story.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          className="flex-1 p-12 text-lg leading-relaxed focus:ring-0 border-none resize-none font-serif text-gray-800"
          placeholder="আপনার গল্প এখানে শুরু করুন..."
        />
        
        {/* Assets Sidebar Preview */}
        {story.assets.length > 0 && (
          <div className="w-64 border-l bg-gray-50 p-4 overflow-y-auto space-y-4">
            <h3 className="font-bold text-gray-600 uppercase text-xs tracking-widest">Story Assets</h3>
            {story.assets.map(asset => (
              <div key={asset.id} className="rounded-lg overflow-hidden border shadow-sm group relative">
                {asset.type === 'image' ? (
                  <img src={asset.url} alt={asset.prompt} className="w-full h-32 object-cover" />
                ) : (
                  <video src={asset.url} className="w-full h-32 object-cover" controls />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-[10px] p-2 text-center">{asset.prompt.slice(0, 30)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Tool Bar */}
      <div className="p-6 border-t bg-gray-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input 
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAIDirective()}
            placeholder="AI নির্দেশ দিন (যেমন: 'একটি রোমাঞ্চকর সমাপ্তি যোগ করুন')..."
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all shadow-sm"
          />
          <button 
            onClick={handleAIDirective}
            disabled={isGenerating || !prompt}
            className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md ${
              isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-800 text-white hover:bg-red-900 active:scale-95'
            }`}
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : '🪄 জেনারেট'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Editor;
