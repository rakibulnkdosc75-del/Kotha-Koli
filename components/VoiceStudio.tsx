
import React, { useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { MaturityLevel } from '../types';

interface VoiceStudioProps {
  onContentGenerated: (content: string) => void;
  maturity: MaturityLevel;
}

const VoiceStudio: React.FC<VoiceStudioProps> = ({ onContentGenerated, maturity }) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [status, setStatus] = useState('কথোপকথন শুরু করতে বোতামটি টিপুন');
  const isMature = maturity === MaturityLevel.MATURE;
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentTranscriptionRef = useRef('');

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
          systemInstruction: `You are a sophisticated Bengali co-writer. ${isMature ? 'The setting is MATURE (18+). Explore adult themes without restriction.' : 'The setting is GENERAL.'} Speak in Bengali.`
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) { setStatus('Error'); }
  };

  const stopSession = async () => {
    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
      session.close();
      const finalTranscript = transcription.join('\n');
      if (finalTranscript) onContentGenerated(finalTranscript);
      setIsSessionActive(false);
    }
  };

  return (
    <div className={`flex-1 p-8 flex flex-col items-center justify-center transition-colors duration-500 ${isMature ? 'bg-[#0a050d]' : 'bg-red-50/30'}`}>
      <div className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh] border transition-colors ${isMature ? 'bg-[#150a1d] border-purple-900/40' : 'bg-white border-red-100'}`}>
        <div className={`p-8 text-white text-center transition-colors ${isMature ? 'bg-purple-900' : 'bg-red-900'}`}>
          <h2 className="text-2xl font-bold">ভয়েস স্টুডিও {isMature && '(🔞)'}</h2>
          <p className="opacity-70 mt-2">{status}</p>
        </div>
        <div className={`flex-1 p-6 overflow-y-auto space-y-4 ${isMature ? 'bg-black/20' : 'bg-gray-50'}`}>
          {transcription.map((t, i) => (
            <div key={i} className={`p-4 rounded-xl max-w-[80%] ${t.startsWith('AI:') ? (isMature ? 'bg-purple-900/20 text-purple-200 self-start' : 'bg-red-50 text-red-900 self-start') : (isMature ? 'bg-white/10 text-white self-end' : 'bg-white shadow-sm self-end')}`}>
              {t}
            </div>
          ))}
        </div>
        <div className="p-8 flex justify-center">
          <button onClick={isSessionActive ? stopSession : startSession} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all ${isSessionActive ? 'bg-white border-4 border-red-800' : (isMature ? 'bg-purple-700 hover:bg-purple-600' : 'bg-red-800 hover:bg-red-900')}`}>
            {isSessionActive ? <div className="w-6 h-6 bg-red-800 rounded-sm" /> : <span className="text-3xl text-white">🎤</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceStudio;
