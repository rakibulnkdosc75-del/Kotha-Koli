
import React from 'react';
import { AppSettings, MaturityLevel } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate }) => {
  return (
    <div className="flex-1 p-10 bg-white">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-red-950 mb-8">সেটিংস (Settings)</h2>
        
        <div className="space-y-8">
          <section className="bg-gray-50 p-8 rounded-3xl border">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">🔞 কন্টেন্ট ম্যাজুরিটি (Content Maturity)</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => onUpdate({ ...settings, maturityLevel: MaturityLevel.GENERAL })}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  settings.maturityLevel === MaturityLevel.GENERAL 
                    ? 'border-green-600 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-xl mb-2">🌱</div>
                <div className="font-bold">General</div>
                <div className="text-xs text-gray-500 mt-1">সকল বয়সের জন্য উপযুক্ত গল্প</div>
              </button>
              
              <button 
                onClick={() => onUpdate({ ...settings, maturityLevel: MaturityLevel.MATURE })}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  settings.maturityLevel === MaturityLevel.MATURE 
                    ? 'border-red-600 bg-red-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-xl mb-2">🔥</div>
                <div className="font-bold">Adult (18+)</div>
                <div className="text-xs text-gray-500 mt-1">প্রাপ্তবয়স্কদের জন্য থিম এবং কন্টেন্ট</div>
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-400 px-2 italic">
              * নোট: '18+' সেটিংটি AI-কে আরও জটিল এবং প্রাপ্তবয়স্ক থিম নিয়ে কাজ করতে সক্ষম করে।
            </p>
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

          <div className="pt-6 border-t flex items-center justify-between text-gray-400">
            <span className="text-sm">Version 1.2.0 - Stable Release</span>
            <div className="flex gap-4">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-xs text-red-600 hover:underline">Billing Docs</a>
              <span className="text-xs">© 2024 KothaKoli AI Studio</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
