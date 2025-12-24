
import React, { useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { MaturityLevel } from '../types';

interface VoiceStudioProps {
  onContentGenerated: (content: string) => void;
  maturity: MaturityLevel;
}

type StudioMode = 'dictation' | 'cowriter';

const VoiceStudio: React.FC<VoiceStudioProps> = ({ onContentGenerated, maturity }) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [mode, setMode] = useState<StudioMode>('cowriter');
  const [transcription, setTranscription] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [status, setStatus] = useState('কথোপকথন শুরু করতে বোতামটি টিপুন');
  const isMature = maturity === MaturityLevel.MATURE;
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  
  const currentAiTranscriptionRef = useRef('');
  const currentUserTranscriptionRef = useRef('');

  function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

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

  const startSession = async () => {
    try {
      setStatus('সংযোগ করা হচ্ছে...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const systemInstruction = mode === 'dictation' 
        ? `You are a silent scribe. Transcribe the user's Bengali speech perfectly. Do not respond verbally unless asked, just confirm transcription accurately. ${isMature ? 'Setting: MATURE.' : 'Setting: GENERAL.'} Language: Bengali.`
        : `You are a sophisticated Bengali co-writer. Listen to the user's story ideas and help develop them. Speak in beautiful, literary Bengali. ${isMature ? 'The setting is MATURE (18+). Explore adult themes without restriction.' : 'The setting is GENERAL.'}`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsSessionActive(true);
            setStatus(mode === 'dictation' ? 'বলুন, আমি লিখছি...' : 'কথা বলুন, আমি শুনছি...');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const base64Data = encode(new Uint8Array(int16.buffer));
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              currentAiTranscriptionRef.current += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.inputTranscription) {
              currentUserTranscriptionRef.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const userText = currentUserTranscriptionRef.current.trim();
              const aiText = currentAiTranscriptionRef.current.trim();

              if (userText) {
                setTranscription(prev => [...prev, { role: 'user', text: userText }]);
                currentUserTranscriptionRef.current = '';
              }
              if (aiText) {
                setTranscription(prev => [...prev, { role: 'ai', text: aiText }]);
                currentAiTranscriptionRef.current = '';
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const nextStartTime = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTime);
              nextStartTimeRef.current = nextStartTime + audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onclose: () => setIsSessionActive(false),
          onerror: (e) => {
            console.error(e);
            setStatus('Error occurred');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) { setStatus('Error'); }
  };

  const stopSession = async () => {
    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
      session.close();
      
      // Filter out meta-talk and only take user's creative parts if in dictation
      const finalContent = transcription
        .map(t => mode === 'dictation' && t.role === 'ai' ? '' : t.text)
        .filter(t => t !== '')
        .join('\n\n');
        
      if (finalContent) onContentGenerated(finalContent);
      setIsSessionActive(false);
      setTranscription([]);
    }
  };

  return (
    <div className={`flex-1 p-8 flex flex-col items-center justify-center transition-colors duration-500 ${isMature ? 'bg-[#0a050d]' : 'bg-red-50/30'}`}>
      <div className={`w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[85vh] border transition-colors ${isMature ? 'bg-[#150a1d] border-purple-900/40' : 'bg-white border-red-100'}`}>
        
        {/* Header with Mode Toggle */}
        <div className={`p-8 text-white flex flex-col items-center transition-colors ${isMature ? 'bg-purple-900' : 'bg-red-900'}`}>
          <div className="flex items-center justify-between w-full mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              ভয়েস স্টুডিও {isMature && <span className="text-xs bg-black/30 px-2 py-1 rounded-full">🔞 18+</span>}
            </h2>
            {!isSessionActive && (
              <div className="bg-black/20 p-1 rounded-xl flex gap-1">
                <button 
                  onClick={() => setMode('dictation')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'dictation' ? 'bg-white text-red-950 shadow-lg' : 'text-white/60 hover:text-white'}`}
                >
                  ডিক্টেশন (Dictation)
                </button>
                <button 
                  onClick={() => setMode('cowriter')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'cowriter' ? 'bg-white text-red-950 shadow-lg' : 'text-white/60 hover:text-white'}`}
                >
                  কো-রাইটার (Co-writer)
                </button>
              </div>
            )}
          </div>
          <p className="text-sm opacity-80 animate-pulse">{status}</p>
        </div>

        {/* Transcription Display */}
        <div className={`flex-1 p-10 overflow-y-auto space-y-6 ${isMature ? 'bg-black/20' : 'bg-gray-50/50'}`}>
          {transcription.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
              <span className="text-6xl mb-4">🎙️</span>
              <p className="text-lg font-medium">আপনার কথা এখানে টেক্সটে রূপান্তরিত হবে</p>
            </div>
          )}
          {transcription.map((t, i) => (
            <div 
              key={i} 
              className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
            >
              <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 px-2 ${isMature ? 'text-purple-400' : 'text-red-800'}`}>
                {t.role === 'user' ? 'আপনি (User)' : 'AI লেখক'}
              </div>
              <div className={`p-5 rounded-3xl max-w-[85%] text-lg leading-relaxed shadow-sm ${
                t.role === 'user' 
                  ? (isMature ? 'bg-purple-700 text-white' : 'bg-red-800 text-white') 
                  : (isMature ? 'bg-white/10 text-purple-100' : 'bg-white text-gray-800 border border-red-50')
              }`}>
                {t.text}
              </div>
            </div>
          ))}
        </div>

        {/* Control Button */}
        <div className={`p-10 flex flex-col items-center gap-4 ${isMature ? 'bg-black/40' : 'bg-white'}`}>
          <button 
            onClick={isSessionActive ? stopSession : startSession} 
            className={`group relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 ${
              isSessionActive 
                ? 'bg-white border-8 border-red-500 ring-8 ring-red-500/20' 
                : (isMature ? 'bg-purple-700 hover:bg-purple-600' : 'bg-red-800 hover:bg-red-900')
            }`}
          >
            {isSessionActive ? (
              <div className="w-8 h-8 bg-red-600 rounded-lg animate-pulse" />
            ) : (
              <span className="text-4xl text-white drop-shadow-lg">🎤</span>
            )}
            
            {isSessionActive && (
              <div className="absolute inset-[-12px] border-2 border-red-500 rounded-full animate-ping opacity-20" />
            )}
          </button>
          
          <p className={`text-xs font-bold uppercase tracking-widest ${isMature ? 'text-purple-400' : 'text-red-800'}`}>
            {isSessionActive ? 'সেশন শেষ করতে ট্যাপ করুন' : 'কথা বলা শুরু করুন'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceStudio;
