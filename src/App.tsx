import React, { useState, useEffect, useRef } from 'react';
import { Building2, Search, Home, BarChart2, Plus, Mic, MicOff, Send, Globe, Bot, Loader2, MapPin, TrendingUp, Info, Volume2, VolumeX, PhoneCall, PhoneOff, Camera, MonitorUp } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";

const floatTo16BitPCM = (input: Float32Array) => {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string) => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

type Tab = 'sites' | 'radar';

// --- MOCK DATA FOR RESEARCH CONTEXT ---
const MOCK_PROPERTIES = [
  {
    id: '1',
    title: 'Apartamento Alto Padrão - Jardins',
    price: 'R$ 2.500.000',
    area: '120m²',
    roi: '8.5% a.a',
    capRate: '6.2%',
    status: 'Abaixo do mercado (15%)',
    address: 'Rua Oscar Freire, São Paulo - SP',
    link: 'rooftop.com.br/id/123'
  },
  {
    id: '2',
    title: 'Studio Investimento - Pinheiros',
    price: 'R$ 650.000',
    area: '35m²',
    roi: '11.2% a.a',
    capRate: '8.1%',
    status: 'Alta liquidez',
    address: 'Rua dos Pinheiros, São Paulo - SP',
    link: 'rooftop.com.br/id/456'
  },
  {
    id: '3',
    title: 'Prédio Comercial - Itaim Bibi',
    price: 'R$ 12.000.000',
    area: '850m²',
    roi: '9.8% a.a',
    capRate: '7.5%',
    status: 'Renda garantida',
    address: 'Av. Brigadeiro Faria Lima, São Paulo - SP',
    link: 'rooftop.com.br/id/789'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('radar');

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-300 font-sans selection:bg-[#D4A353]/30 flex flex-col">
      {/* Header */}
      <header className="bg-[#131B2B] border-b border-slate-800/50 px-6 py-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-[#D4A353] p-2 rounded-lg text-[#0A0F1C]">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              <span className="text-[#D4A353]">Radar</span> de Imóveis
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Inteligência de mercado imobiliário</p>
          </div>
        </div>
        <div className="hidden md:flex gap-3">
          <div className="px-4 py-1.5 rounded-full border border-[#D4A353]/30 text-[#D4A353] text-sm bg-[#D4A353]/5">
            {MOCK_PROPERTIES.length} imóveis no radar
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="px-6 border-b border-slate-800/50 bg-[#0A0F1C] flex-shrink-0">
        <div className="flex gap-8">
          <TabButton active={activeTab === 'radar'} onClick={() => setActiveTab('radar')} icon={<Search size={18} />} label="Radar & IA" />
          <TabButton active={activeTab === 'sites'} onClick={() => setActiveTab('sites')} icon={<Globe size={18} />} label="Fontes de Dados" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-4 md:p-6 max-w-[1600px] mx-auto w-full">
        {activeTab === 'radar' && <RadarTab />}
        {activeTab === 'sites' && <SitesTab />}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
        active 
          ? 'border-[#D4A353] text-[#D4A353]' 
          : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

// --- RADAR TAB (INTEGRATED RESEARCH + AI) ---
function RadarTab() {
  const [selectedProperty, setSelectedProperty] = useState<typeof MOCK_PROPERTIES[0] | null>(null);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Panel: Research / Radar */}
      <div className="flex-1 flex flex-col bg-[#131B2B] rounded-xl border border-slate-800/50 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800/50 bg-[#0A0F1C]/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Search className="text-[#D4A353]" size={20} />
            Radar de Oportunidades
          </h2>
          <span className="text-xs text-slate-400">Selecione um imóvel para analisar com a IA</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {MOCK_PROPERTIES.map(prop => (
            <div 
              key={prop.id}
              onClick={() => setSelectedProperty(prop)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedProperty?.id === prop.id 
                  ? 'bg-[#D4A353]/10 border-[#D4A353]/50 shadow-[0_0_15px_rgba(212,163,83,0.1)]' 
                  : 'bg-[#0A0F1C] border-slate-800/50 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-white font-medium text-lg">{prop.title}</h3>
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-medium border border-emerald-500/20">
                  {prop.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                <MapPin size={14} />
                {prop.address}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Preço</p>
                  <p className="text-white font-semibold">{prop.price}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Cap Rate</p>
                  <p className="text-emerald-400 font-semibold flex items-center gap-1">
                    <TrendingUp size={14} /> {prop.capRate}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Área</p>
                  <p className="text-white font-semibold">{prop.area}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: AI Assistant */}
      <div className="w-full lg:w-[450px] flex-shrink-0 flex flex-col">
        <AIAssistant contextData={selectedProperty} allProperties={MOCK_PROPERTIES} />
      </div>
    </div>
  );
}

// --- AI ASSISTANT COMPONENT ---
type Message = {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
};

function AIAssistant({ contextData, allProperties }: { contextData: any, allProperties?: any[] }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: 'Olá! Sou a Gaia, sua especialista do Radar de Imóveis. Selecione um imóvel no radar para analisarmos, ou me faça uma pergunta. Você pode digitar ou me ligar clicando no botão de telefone!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraSharing, setIsCameraSharing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Live API Refs
  const sessionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Video Sharing Refs
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoIntervalRef = useRef<any>(null);
  const callTranscriptRef = useRef<string>('');

  const personaInstruction = "Seu nome é Gaia, você é uma especialista imobiliária do Radar de Imóveis. Você é uma mulher ruiva, veste um terno elegante e tem uma postura muito profissional, mas ao mesmo tempo super fluida, natural, amigável e 'legal'. Fale SEMPRE em português do Brasil, a menos que o usuário peça explicitamente para você falar em outro idioma. Fale como se estivesse em uma conversa agradável. Evite ser robótica. O usuário pode enviar textos sem pontuação, então interprete o contexto com inteligência. Vá direto ao ponto, mas com simpatia e energia. Se o usuário compartilhar a tela ou a câmera, comente sobre o que você está vendo se for relevante.";

  // Initialize Text Chat & Speech Recognition
  useEffect(() => {
    // Speech Recognition Setup
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsDictating(false);
      };

      recognitionRef.current.onend = () => {
        setIsDictating(false);
      };
    }

    // Gemini Setup
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let instruction = personaInstruction;
      if (allProperties) {
        instruction += `\n\nATENÇÃO: O usuário está visualizando a tela "Radar de Oportunidades" com os seguintes imóveis listados na página:\n${JSON.stringify(allProperties, null, 2)}`;
      }
      if (contextData) {
        instruction += `\n\nO usuário clicou e está focando especificamente neste imóvel agora:\n${JSON.stringify(contextData, null, 2)}\n\nAnalise este imóvel com base nesses dados.`;
        setMessages(prev => [
          ...prev.filter(m => m.role !== 'system'),
          { id: Date.now().toString(), role: 'system', text: `Contexto atualizado: Analisando ${contextData.title}` }
        ]);
      } else {
        setMessages(prev => [
          ...prev.filter(m => m.role !== 'system'),
          { id: Date.now().toString(), role: 'system', text: `Contexto atualizado: Lendo todos os imóveis do radar.` }
        ]);
      }
      chatRef.current = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: { systemInstruction: instruction }
      });
    } catch (error) {
      console.error("Failed to initialize Gemini:", error);
    }
  }, [contextData, allProperties]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleDictation = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsDictating(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // --- TEXT CHAT LOGIC ---
  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading || isCalling) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      if (!chatRef.current) throw new Error("Chat not initialized");
      
      const responseStream = await chatRef.current.sendMessageStream({ message: text });
      const modelMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '' }]);
      
      let fullText = '';
      for await (const chunk of responseStream) {
        const c = chunk as any;
        if (c.text) {
          fullText += c.text;
          setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId ? { ...msg, text: fullText } : msg
          ));
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `Desculpe, ocorreu um erro. Detalhe: ${error?.message || 'Erro desconhecido'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- LIVE API (CALL) LOGIC ---
  const startVideoSharing = async (type: 'screen' | 'camera') => {
    try {
      let stream: MediaStream;
      if (type === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setIsScreenSharing(true);
        setIsCameraSharing(false);
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setIsCameraSharing(true);
        setIsScreenSharing(false);
      }

      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
      }
      videoStreamRef.current = stream;

      if (!videoElementRef.current) {
        videoElementRef.current = document.createElement('video');
        videoElementRef.current.autoplay = true;
        videoElementRef.current.playsInline = true;
      }
      videoElementRef.current.srcObject = stream;

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
      }

      videoIntervalRef.current = setInterval(() => {
        if (!videoElementRef.current || !canvasRef.current || !sessionRef.current) return;
        
        const video = videoElementRef.current;
        const canvas = canvasRef.current;
        
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        const maxWidth = 640;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
          
          sessionRef.current.then((session: any) => {
            session.sendRealtimeInput({
              video: { data: base64Data, mimeType: 'image/jpeg' }
            });
          }).catch(console.error);
        }
      }, 1000); // 1 FPS

      stream.getVideoTracks()[0].onended = () => {
        stopVideoSharing();
      };

    } catch (err) {
      console.error("Failed to start video sharing:", err);
      setIsScreenSharing(false);
      setIsCameraSharing(false);
    }
  };

  const stopVideoSharing = () => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }
    setIsScreenSharing(false);
    setIsCameraSharing(false);
  };

  const playNext = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    const buffer = audioQueueRef.current.shift()!;
    const source = audioCtxRef.current!.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtxRef.current!.destination);
    source.onended = playNext;
    source.start();
    currentSourceRef.current = source;
  };

  const enqueuePCM = (base64Data: string) => {
    if (!audioCtxRef.current) return;
    const arrayBuffer = base64ToArrayBuffer(base64Data);
    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 0x8000;
    }
    const audioBuffer = audioCtxRef.current.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);
    audioQueueRef.current.push(audioBuffer);
    if (!isPlayingRef.current) playNext();
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioCtxRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      
      const processor = audioCtxRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const dummyGain = audioCtxRef.current.createGain();
      dummyGain.gain.value = 0;

      source.connect(processor);
      processor.connect(dummyGain);
      dummyGain.connect(audioCtxRef.current.destination);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let instruction = personaInstruction;
      if (allProperties) {
        instruction += `\n\nATENÇÃO: O usuário está visualizando a tela "Radar de Oportunidades" com os seguintes imóveis listados na página:\n${JSON.stringify(allProperties, null, 2)}`;
      }
      if (contextData) {
        instruction += `\n\nATENÇÃO: O usuário clicou e está focando especificamente neste imóvel agora:\n${JSON.stringify(contextData, null, 2)}`;
      }

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: instruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsCalling(true);
            callTranscriptRef.current = '';
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBuffer = floatTo16BitPCM(inputData);
              const base64Data = arrayBufferToBase64(pcmBuffer);
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
          },
          onmessage: (message: any) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              enqueuePCM(base64Audio);
            }
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              if (currentSourceRef.current) {
                currentSourceRef.current.stop();
              }
            }
            if (message.serverContent?.modelTurn) {
              const text = message.serverContent.modelTurn.parts?.map((p: any) => p.text).filter(Boolean).join(' ');
              if (text) callTranscriptRef.current += `\nGaia: ${text}`;
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.parts?.map((p: any) => p.text).filter(Boolean).join(' ');
              if (text) callTranscriptRef.current += `\nGaia: ${text}`;
            }
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.parts?.map((p: any) => p.text).filter(Boolean).join(' ');
              if (text) callTranscriptRef.current += `\nUsuário: ${text}`;
            }
          },
          onclose: () => endCall(),
          onerror: (err) => { console.error(err); endCall(); }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err) {
      console.error("Failed to start call:", err);
      alert("Não foi possível acessar o microfone ou iniciar a chamada.");
    }
  };

  const endCall = () => {
    setIsCalling(false);
    stopVideoSharing();
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
    }
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    const transcript = callTranscriptRef.current;
    if (transcript.trim()) {
      generateCallSummary(transcript);
      callTranscriptRef.current = '';
    }
  };

  const generateCallSummary = async (transcript: string) => {
    const summaryMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: summaryMsgId, role: 'system', text: 'Gerando resumo da ligação...' }]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Faça um resumo estruturado e profissional da seguinte ligação entre o Usuário e a especialista imobiliária Gaia. Destaque os imóveis discutidos, pontos de interesse e próximos passos combinados. Transcrição:\n${transcript}`
      });
      setMessages(prev => prev.map(msg => msg.id === summaryMsgId ? { ...msg, text: `📋 **Resumo da Ligação:**\n\n${response.text}` } : msg));
    } catch (e) {
      setMessages(prev => prev.map(msg => msg.id === summaryMsgId ? { ...msg, text: 'Não foi possível gerar o resumo da ligação.' } : msg));
    }
  };

  const toggleCall = () => {
    if (isCalling) {
      endCall();
    } else {
      startCall();
    }
  };

  return (
    <div className="bg-[#131B2B] rounded-xl border border-slate-800/50 h-full flex flex-col overflow-hidden shadow-2xl relative">
      {/* Call Overlay */}
      {isCalling && (
        <div className="absolute inset-0 z-10 bg-[#0A0F1C]/95 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300 p-4 overflow-y-auto">
          <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-full bg-[#D4A353]/20 flex items-center justify-center mb-4 sm:mb-6 relative overflow-hidden border-4 border-[#D4A353]">
            <div className="absolute inset-0 rounded-full border-2 border-[#D4A353] animate-ping opacity-20"></div>
            <div className="absolute inset-2 rounded-full border-2 border-[#D4A353] animate-ping opacity-40" style={{ animationDelay: '0.5s' }}></div>
            <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&h=200" alt="Gaia" className="w-full h-full object-cover rounded-full relative z-10" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2 text-center">Em chamada com a IA...</h3>
          <p className="text-sm text-slate-400 mb-6 sm:mb-8 text-center">Fale naturalmente. A IA está ouvindo.</p>
          
          <div className="flex gap-4 mb-6 sm:mb-10">
            <button
              onClick={() => isCameraSharing ? stopVideoSharing() : startVideoSharing('camera')}
              className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl transition-all ${isCameraSharing ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-[#131B2B] text-slate-400 border border-slate-700 hover:border-[#D4A353] hover:text-[#D4A353]'}`}
            >
              <Camera size={20} className="sm:w-6 sm:h-6" />
              <span className="text-xs font-medium">Câmera</span>
            </button>
            <button
              onClick={() => isScreenSharing ? stopVideoSharing() : startVideoSharing('screen')}
              className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl transition-all ${isScreenSharing ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-[#131B2B] text-slate-400 border border-slate-700 hover:border-[#D4A353] hover:text-[#D4A353]'}`}
            >
              <MonitorUp size={20} className="sm:w-6 sm:h-6" />
              <span className="text-xs font-medium">Tela</span>
            </button>
          </div>

          <button
            onClick={endCall}
            className="bg-red-500 hover:bg-red-600 text-white p-4 sm:p-6 rounded-full shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-all hover:scale-105 z-10"
          >
            <PhoneOff size={24} className="sm:w-8 sm:h-8" />
          </button>

          <video 
            ref={videoElementRef}
            autoPlay
            playsInline
            muted
            className={`absolute bottom-6 right-6 w-32 h-48 md:w-48 md:h-72 object-cover rounded-2xl border-4 border-[#D4A353] shadow-2xl z-50 transition-all duration-500 ${isCameraSharing || isScreenSharing ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
          />
        </div>
      )}

      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800/50 bg-[#0A0F1C]/80 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-[#D4A353]/20 p-1 rounded-full relative w-12 h-12 flex-shrink-0 flex items-center justify-center overflow-hidden border border-[#D4A353]/50">
            <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=100&h=100" alt="Gaia" className="w-full h-full object-cover rounded-full" />
            {contextData && (
              <span className="absolute -top-0 -right-0 w-3 h-3 bg-emerald-500 border-2 border-[#131B2B] rounded-full"></span>
            )}
          </div>
          <div>
            <h2 className="text-white font-medium text-lg">Gaia - Especialista IA</h2>
            <p className="text-xs text-slate-400">
              {contextData ? 'Conectada ao Radar' : 'Aguardando contexto...'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleCall}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full hover:bg-emerald-500/20 transition-colors"
        >
          <PhoneCall size={16} />
          <span className="text-sm font-medium">Ligar para IA</span>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
            {msg.role === 'system' ? (
              <div className="bg-[#D4A353]/10 border border-[#D4A353]/20 px-4 py-2 rounded-full flex items-center gap-2">
                <Info size={14} className="text-[#D4A353]" />
                <span className="text-xs text-[#D4A353] font-medium">{msg.text}</span>
              </div>
            ) : (
              <div className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-md ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-[#D4A353] to-[#B8863B] text-[#0A0F1C] rounded-tr-sm' 
                  : 'bg-[#1E293B] text-slate-200 rounded-tl-sm border border-slate-700/50'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#1E293B] rounded-2xl rounded-tl-sm px-5 py-4 border border-slate-700/50 flex items-center gap-3 shadow-md">
              <Loader2 className="animate-spin text-[#D4A353]" size={18} />
              <span className="text-sm text-slate-400">Analisando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800/50 bg-[#0A0F1C]/80 flex-shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-end gap-3"
        >
          <div className="flex-1 relative flex items-center bg-[#131B2B] border border-slate-700/50 rounded-xl shadow-inner focus-within:border-[#D4A353]/50 transition-colors">
            <button
              type="button"
              onClick={toggleDictation}
              className={`p-3 transition-colors ${isDictating ? 'text-red-400 animate-pulse' : 'text-slate-400 hover:text-[#D4A353]'}`}
              title="Ditar mensagem"
            >
              {isDictating ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={contextData ? `Escreva sobre o ${contextData.title}...` : "Escreva uma mensagem..."}
              className="w-full bg-transparent pl-2 pr-4 py-3.5 text-sm text-white focus:outline-none resize-none min-h-[52px] max-h-[120px]"
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isCalling}
            className="bg-gradient-to-r from-[#D4A353] to-[#B8863B] hover:from-[#E5B464] hover:to-[#C9974C] disabled:opacity-50 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-[#0A0F1C] p-3.5 rounded-xl transition-all flex-shrink-0 shadow-lg"
          >
            <Send size={20} />
          </button>
        </form>
        <div className="mt-3 text-center">
          <p className="text-xs text-slate-500">
            Dica: Para conversar por voz, clique em "Ligar para IA" no topo.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- SITES TAB (FROM PREVIOUS LAYOUT) ---
function SitesTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="bg-[#131B2B] rounded-xl border border-slate-800/50 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Plus className="text-[#D4A353]" size={20} />
          Adicionar Novo Site
        </h2>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <input 
              type="text" 
              placeholder="Nome do site" 
              className="w-full bg-[#0A0F1C] border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4A353]/50 transition-colors"
            />
          </div>
          <div className="flex-1 w-full">
            <input 
              type="text" 
              placeholder="URL base (ex: https://www.vivareal.com.br)" 
              className="w-full bg-[#0A0F1C] border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4A353]/50 transition-colors"
            />
          </div>
          <button className="w-full md:w-auto bg-gradient-to-r from-[#D4A353] to-[#B8863B] hover:from-[#E5B464] hover:to-[#C9974C] text-[#0A0F1C] font-semibold px-8 py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
            <Plus size={18} />
            Adicionar
          </button>
        </div>
      </div>

      <div className="bg-[#131B2B] rounded-xl border border-slate-800/50 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800/50">
          <h2 className="text-lg font-semibold text-white">Sites Configurados</h2>
        </div>
        <div className="p-6">
          <div className="mb-1">
            <h3 className="text-white font-medium text-lg">Rooftop</h3>
            <a href="https://imoveis.rooftop.com.br" target="_blank" rel="noreferrer" className="text-sm text-slate-400 hover:text-[#D4A353] transition-colors">
              https://imoveis.rooftop.com.br
            </a>
          </div>
          <p className="text-xs text-slate-500 mt-2">Tipo: rooftop | ID: rooftop</p>
        </div>
      </div>
    </div>
  );
}
