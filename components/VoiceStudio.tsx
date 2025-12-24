
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

interface VoiceStudioProps {
  onContentGenerated: (content: string) => void;
}

const VoiceStudio: React.FC<VoiceStudioProps> = ({ onContentGenerated }) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [status, setStatus] = useState('কথোপকথন শুরু করতে বোতামটি টিপুন');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentTranscriptionRef = useRef('');

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const startSession = async () => {
    try {
      setStatus('সংযোগ করা হচ্ছে...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsSessionActive(true);
            setStatus('কথা বলুন, আমি শুনছি...');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' } });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              currentTranscriptionRef.current += message.serverContent.outputTranscription.text;
            }
            
            if (message.serverContent?.turnComplete) {
              const text = currentTranscriptionRef.current;
              if (text) {
                setTranscription(prev => [...prev, `AI: ${text}`]);
                currentTranscriptionRef.current = '';
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

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: () => setStatus('Error occurred'),
          onclose: () => {
            setIsSessionActive(false);
            setStatus('সেশন শেষ হয়েছে');
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          systemInstruction: "You are a creative Bengali co-writer. Listen to the user's story ideas and help them expand them conversationally in Bengali. Speak in a friendly, encouraging tone."
        }
      });

      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      console.error(err);
      setStatus('মাইক্রোফোন সংযোগে সমস্যা');
    }
  };

  const stopSession = async () => {
    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
      session.close();
      if (currentTranscriptionRef.current) {
        onContentGenerated(currentTranscriptionRef.current);
      }
      setIsSessionActive(false);
    }
  };

  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center bg-red-50/30">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        <div className="p-8 bg-red-900 text-white text-center">
          <h2 className="text-2xl font-bold">ভয়েস রাইটিং স্টুডিও</h2>
          <p className="text-red-200 mt-2">{status}</p>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50">
          {transcription.length === 0 && !isSessionActive && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <span className="text-6xl">🎙️</span>
              <p>কথা বলে আপনার গল্প তৈরি করুন</p>
            </div>
          )}
          {transcription.map((t, i) => (
            <div key={i} className={`p-4 rounded-xl max-w-[80%] ${t.startsWith('AI:') ? 'bg-red-50 text-red-900 self-start border border-red-100' : 'bg-white shadow-sm self-end'}`}>
              {t}
            </div>
          ))}
          {isSessionActive && (
            <div className="flex gap-2 p-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce delay-150"></div>
            </div>
          )}
        </div>

        <div className="p-8 flex justify-center">
          {!isSessionActive ? (
            <button 
              onClick={startSession}
              className="group relative flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-red-800 rounded-full animate-ping opacity-20 group-hover:opacity-40"></div>
              <div className="w-20 h-20 bg-red-800 rounded-full flex items-center justify-center shadow-xl hover:bg-red-900 transition-all z-10">
                <span className="text-3xl text-white">🎤</span>
              </div>
              <span className="absolute -bottom-10 text-red-900 font-bold whitespace-nowrap">শুরু করুন</span>
            </button>
          ) : (
            <button 
              onClick={stopSession}
              className="w-20 h-20 bg-white border-4 border-red-800 rounded-full flex items-center justify-center shadow-xl hover:bg-red-50 transition-all"
            >
              <div className="w-6 h-6 bg-red-800 rounded-sm"></div>
              <span className="absolute -bottom-10 text-red-900 font-bold whitespace-nowrap">থামান ও সেভ করুন</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceStudio;
