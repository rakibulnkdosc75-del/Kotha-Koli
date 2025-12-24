
import React, { useState } from 'react';
import { AppSettings, MaturityLevel } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate }) => {
  const [showAgeModal, setShowAgeModal] = useState(false);

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

  return (
    <div className="flex-1 p-10 bg-white overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-red-950 mb-8">সেটিংস (Settings)</h2>
        
        <div className="space-y-8">
          <section className="bg-gray-50 p-8 rounded-3xl border">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">🔞 কন্টেন্ট ম্যাজুরিটি (Content Maturity)</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => toggleMaturity(MaturityLevel.GENERAL)}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  settings.maturityLevel === MaturityLevel.GENERAL 
                    ? 'border-green-600 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-xl mb-2">🌱</div>
                <div className="font-bold">General</div>
                <div className="text-xs text-gray-500 mt-1">Wholesome storytelling for all.</div>
              </button>
              
              <button 
                onClick={() => toggleMaturity(MaturityLevel.MATURE)}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  settings.maturityLevel === MaturityLevel.MATURE 
                    ? 'border-purple-600 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-xl mb-2">🔥</div>
                <div className="font-bold">Adult (18+)</div>
                <div className="text-xs text-gray-500 mt-1">Unlock adult themes & dark fiction.</div>
              </button>
            </div>

            {settings.maturityLevel === MaturityLevel.MATURE && (
              <div className="mt-6 p-4 bg-purple-100 rounded-xl border border-purple-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.blurMatureThumbnails}
                    onChange={(e) => onUpdate({ ...settings, blurMatureThumbnails: e.target.checked })}
                    className="w-5 h-5 accent-purple-700"
                  />
                  <span className="text-sm font-bold text-purple-900">Blur Mature Content in Library</span>
                </label>
              </div>
            )}
          </section>

          <section className="bg-gray-50 p-8 rounded-3xl border">
            <h3 className="text-lg font-bold mb-6">🌐 ভাষা (Language)</h3>
            <select 
              value={settings.language}
              onChange={(e) => onUpdate({ ...settings, language: e.target.value })}
              className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-200 outline-none"
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
