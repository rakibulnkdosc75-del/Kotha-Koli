
import React, { useState } from 'react';
import { Story, MaturityLevel, StoryTone } from '../types';
import { gemini } from '../services/gemini';

interface EditorProps {
  story: Story;
  onUpdate: (updates: Partial<Story>) => void;
  maturity: MaturityLevel;
}

const Editor: React.FC<EditorProps> = ({ story, onUpdate, maturity }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const isMatureMode = story.maturity === MaturityLevel.MATURE;

  const handleAIDirective = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const result = await gemini.generateStory(
        `Focusing on the '${story.tone || 'Standard'}' tone, continue this story: ${prompt}. Current content: ${story.content}`,
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
            {isMatureMode ? '🔞 Mature' : 'General'}
          </span>
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
          placeholder="আপনার প্রাপ্তবয়স্ক পাঠকদের জন্য চমৎকার একটি গল্প শুরু করুন..."
        />
        
        {/* Assets Sidebar Preview */}
        {story.assets.length > 0 && (
          <div className={`w-64 border-l overflow-y-auto space-y-4 p-4 ${isMatureMode ? 'bg-[#150a1d] border-purple-900/30' : 'bg-gray-50'}`}>
            <h3 className={`font-bold uppercase text-xs tracking-widest ${isMatureMode ? 'text-purple-400' : 'text-gray-600'}`}>Story Assets</h3>
            {story.assets.map(asset => (
              <div key={asset.id} className={`rounded-lg overflow-hidden border shadow-sm group relative ${isMatureMode ? 'border-purple-800/50' : 'border-gray-200'}`}>
                {asset.type === 'image' ? (
                  <img src={asset.url} alt={asset.prompt} className="w-full h-32 object-cover" />
                ) : (
                  <video src={asset.url} className="w-full h-32 object-cover" controls />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Tool Bar */}
      <div className={`p-6 border-t shadow-lg ${isMatureMode ? 'bg-[#150a1d] border-purple-900/50' : 'bg-gray-50 border-gray-200'}`}>
        <div className="max-w-4xl mx-auto flex gap-3">
          <input 
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAIDirective()}
            placeholder={isMatureMode ? "গল্পের আরও প্রাপ্তবয়স্ক গভীরতা দিন..." : "AI নির্দেশ দিন..."}
            className={`flex-1 px-4 py-3 rounded-xl border outline-none transition-all shadow-sm ${
              isMatureMode 
                ? 'bg-purple-950/30 border-purple-800 text-purple-100 placeholder-purple-700 focus:border-purple-500' 
                : 'bg-white border-gray-300 focus:border-red-500'
            }`}
          />
          <button 
            onClick={handleAIDirective}
            disabled={isGenerating || !prompt}
            className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md ${
              isGenerating 
                ? 'bg-gray-400' 
                : isMatureMode 
                  ? 'bg-purple-700 text-white hover:bg-purple-600' 
                  : 'bg-red-800 text-white hover:bg-red-900'
            }`}
          >
            {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '🪄 জেনারেট'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Editor;
