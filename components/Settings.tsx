
import React, { useState } from 'react';
import { AppSettings, MaturityLevel } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate }) => {
  const [showAgeModal, setShowAgeModal] = useState(false);
  const isDarkMode = settings.isDarkMode;

  const toggleMaturity = (level: MaturityLevel) => {
    if (level === MaturityLevel.MATURE && !settings.isConfirmedAdult) {
      setShowAgeModal(true);
    } else {
      onUpdate({ ...settings, maturityLevel: level });
    }
  };

  const confirmAge = () => {
    onUpdate({ ...settings, maturityLevel: MaturityLevel.MATURE, isConfirmedAdult: true });
    setShowAgeModal(false);
  };

  const sectionClass = `p-8 rounded-3xl border transition-colors ${isDarkMode ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-900'}`;
  const inputClass = `w-full p-4 rounded-xl border outline-none transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 focus:border-red-500' : 'bg-white border-gray-300 focus:ring-2 focus:ring-red-200'}`;

  return (
    <div className={`flex-1 p-10 overflow-y-auto transition-colors duration-500 ${isDarkMode ? 'bg-gray-950' : 'bg-white'}`}>
      <div className="max-w-2xl mx-auto">
        <h2 className={`text-3xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-red-950'}`}>সেটিংস (Settings)</h2>
        
        <div className="space-y-8">
          {/* Theme Section */}
          <section className={sectionClass}>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">🌓 থিম (Theme)</h3>
            <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
              <div>
                <p className="font-bold">ডার্ক মোড (Dark Mode)</p>
                <p className="text-xs opacity-60">অ্যাপের ইন্টারফেস অন্ধকার থিমে ব্যবহার করুন।</p>
              </div>
              <button 
                onClick={() => onUpdate({ ...settings, isDarkMode: !settings.isDarkMode })}
                className={`relative w-14 h-8 rounded-full transition-colors ${isDarkMode ? 'bg-red-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>

          <section className={sectionClass}>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">🔞 কন্টেন্ট ম্যাজুরিটি (Content Maturity)</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => toggleMaturity(MaturityLevel.GENERAL)}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  settings.maturityLevel === MaturityLevel.GENERAL 
                    ? (isDarkMode ? 'border-red-600 bg-red-900/20' : 'border-green-600 bg-green-50') 
                    : (isDarkMode ? 'border-gray-800 hover:border-gray-700' : 'border-gray-200 hover:border-gray-300')
                }`}
              >
                <div className="text-xl mb-2">🌱</div>
                <div className="font-bold">General</div>
                <div className="text-xs opacity-60 mt-1">Wholesome storytelling for all.</div>
              </button>
              
              <button 
                onClick={() => toggleMaturity(MaturityLevel.MATURE)}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  settings.maturityLevel === MaturityLevel.MATURE 
                    ? (isDarkMode ? 'border-purple-600 bg-purple-900/20' : 'border-purple-600 bg-purple-50') 
                    : (isDarkMode ? 'border-gray-800 hover:border-gray-700' : 'border-gray-200 hover:border-gray-300')
                }`}
              >
                <div className="text-xl mb-2">🔥</div>
                <div className="font-bold">Adult (18+)</div>
                <div className="text-xs opacity-60 mt-1">Unlock adult themes & dark fiction.</div>
              </button>
            </div>

            {settings.maturityLevel === MaturityLevel.MATURE && (
              <div className={`mt-6 p-4 rounded-xl border ${isDarkMode ? 'bg-purple-900/40 border-purple-800' : 'bg-purple-100 border-purple-200'}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.blurMatureThumbnails}
                    onChange={(e) => onUpdate({ ...settings, blurMatureThumbnails: e.target.checked })}
                    className="w-5 h-5 accent-purple-700"
                  />
                  <span className={`text-sm font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-900'}`}>Blur Mature Content in Library</span>
                </label>
              </div>
            )}
          </section>

          <section className={sectionClass}>
            <h3 className="text-lg font-bold mb-6">🌐 ভাষা (Language)</h3>
            <select 
              value={settings.language}
              onChange={(e) => onUpdate({ ...settings, language: e.target.value })}
              className={inputClass}
            >
              <option value="Bengali">Standard Bengali (প্রমিত বাংলা)</option>
              <option value="Dhaka">Dhaka Dialect (ঢাকার উপভাষা)</option>
              <option value="Chittagong">Chittagong Dialect (চাটগাঁইয়া)</option>
              <option value="Sylhet">Sylheti Dialect (সিলটী)</option>
            </select>
          </section>
        </div>
      </div>

      {showAgeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[#150a1d] text-white p-10 rounded-[40px] max-w-md border border-purple-500/30 text-center shadow-2xl">
            <div className="text-6xl mb-6">🔞</div>
            <h2 className="text-2xl font-bold mb-4">Are you 18 or older?</h2>
            <p className="text-purple-300 mb-8 leading-relaxed">
              Adult mode allows the AI to generate content with explicit themes, dark psychological narratives, and sensual descriptions.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmAge}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 rounded-2xl font-bold transition-all"
              >
                Yes, I am over 18
              </button>
              <button 
                onClick={() => setShowAgeModal(false)}
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
