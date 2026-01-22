
import React, { useState, useEffect } from 'react';
import { 
  Camera, Upload, RefreshCw, ShoppingCart, Sparkles, TrendingUp, 
  Search, Info, ExternalLink, Copy, Check, Trash2, History, ChevronLeft,
  Clock, Tag, Package, MessageSquare, ShieldCheck, Zap, LayoutGrid, Lock
} from 'lucide-react';
import { AppStep, ProductDetails, AnalysisResult, HistoryItem } from './types';
import { analyzeProductListing, enhanceProductImage } from './services/geminiService';
import { Button } from './components/Button';

// PIN DE ACCESO (Cámbialo aquí si quieres otro)
const ACCESS_PIN = "1234";

const App: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'tips'>('scan');
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [image, setImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [details, setDetails] = useState<ProductDetails>({
    platform: 'Wallapop',
    minPrice: '',
    urgency: 'Media',
    delivery: 'En mano y envío'
  });
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // Comprobar si ya se autorizó anteriormente en este móvil
    const auth = localStorage.getItem('vendepro_auth');
    if (auth === 'true') setIsAuthorized(true);

    const savedHistory = localStorage.getItem('vendepro_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const handlePinInput = (num: string) => {
    if (pinInput.length < 4) {
      const newPin = pinInput + num;
      setPinInput(newPin);
      if (newPin.length === 4) {
        if (newPin === ACCESS_PIN) {
          setIsAuthorized(true);
          localStorage.setItem('vendepro_auth', 'true');
        } else {
          setPinError(true);
          setTimeout(() => {
            setPinInput("");
            setPinError(false);
          }, 500);
        }
      }
    }
  };

  const saveToHistory = (item: HistoryItem) => {
    const newHistory = [item, ...history].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('vendepro_history', JSON.stringify(newHistory));
  };

  const loadFromHistory = (item: HistoryItem) => {
    setImage(item.image);
    setEnhancedImage(item.enhancedImage);
    setDetails(item.details);
    setAnalysis(item.analysis);
    setStep(AppStep.RESULTS);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setStep(AppStep.DETAILS);
      };
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async () => {
    if (!image) return;
    setIsProcessing(true);
    setError(null);
    setStep(AppStep.ANALYZING);
    try {
      const base64Data = image.split(',')[1];
      const result = await analyzeProductListing(base64Data, details);
      setAnalysis(result);
      
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        image,
        enhancedImage: null,
        details: { ...details },
        analysis: result
      };
      saveToHistory(newHistoryItem);
      setStep(AppStep.RESULTS);
    } catch (err) {
      setError("Fallo al analizar. Reintenta.");
      setStep(AppStep.DETAILS);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnhance = async () => {
    if (!image || !analysis) return;
    setIsProcessing(true);
    try {
      const base64Data = image.split(',')[1];
      const result = await enhanceProductImage(base64Data);
      if (result) setEnhancedImage(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string, sectionId: string) => {
    const cleanText = text.replace(/[*#_~]/g, '').trim();
    navigator.clipboard.writeText(cleanText).then(() => {
      setCopiedId(sectionId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const reset = () => {
    setStep(AppStep.UPLOAD);
    setImage(null);
    setEnhancedImage(null);
    setAnalysis(null);
    setError(null);
    setActiveTab('scan');
  };

  const parseSections = (text: string) => {
    const sections: { title: string; content: string; isPlainText: boolean; isChat: boolean }[] = [];
    const parts = text.split(/###\s+/);
    parts.forEach(part => {
      if (!part.trim()) return;
      const lines = part.split('\n');
      const title = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();
      const isPlainText = title.includes('TÍTULO') || title.includes('DESCRIPCIÓN') || title.includes('MENSAJE') || title.includes('RESPUESTAS');
      const isChat = title.includes('MENSAJE') || title.includes('RESPUESTAS');
      sections.push({ title, content, isPlainText, isChat });
    });
    return sections;
  };

  const renderFormattedContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <div key={i} className="mb-1 leading-snug">
        {line.replace(/^[-*]\s?/, '• ')}
      </div>
    ));
  };

  const goToTab = (tab: 'scan' | 'history' | 'tips') => {
    setActiveTab(tab);
    if (tab === 'scan') {
      if (!image) setStep(AppStep.UPLOAD);
    }
  };

  // PANTALLA DE BLOQUEO
  if (!isAuthorized) {
    return (
      <div className="flex flex-col h-full bg-white items-center justify-center px-10 animate-ios">
        <div className="mb-12 flex flex-col items-center">
          <div className="bg-emerald-50 p-6 rounded-full text-emerald-600 mb-4">
            <Lock size={40} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Acceso Privado</h2>
          <p className="text-gray-400 text-sm font-medium mt-2">Introduce tu PIN de VendePro</p>
        </div>

        <div className="flex gap-4 mb-12">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 border-emerald-600 transition-all duration-200 ${
                pinInput.length > i ? 'bg-emerald-600 scale-110' : 'bg-transparent'
              } ${pinError ? 'bg-red-500 border-red-500 animate-pulse' : ''}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button 
              key={num} 
              onClick={() => handlePinInput(num.toString())}
              className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-2xl font-bold active:bg-emerald-600 active:text-white transition-colors"
            >
              {num}
            </button>
          ))}
          <div />
          <button 
            onClick={() => handlePinInput("0")}
            className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-2xl font-bold active:bg-emerald-600 active:text-white transition-colors"
          >
            0
          </button>
          <button 
            onClick={() => setPinInput(pinInput.slice(0, -1))}
            className="w-20 h-20 flex items-center justify-center text-gray-400 active:text-red-500"
          >
            <ChevronLeft size={24} />
          </button>
        </div>
      </div>
    );
  }

  // APP PRINCIPAL
  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <header className="pt-[calc(env(safe-area-inset-top)+15px)] pb-4 px-6 bg-white shrink-0">
        <div className="flex justify-between items-end">
          <h1 className="text-3xl font-black tracking-tight">
            {activeTab === 'scan' ? 'Vender' : activeTab === 'history' ? 'Mis Ventas' : 'Estrategia'}
          </h1>
          {step !== AppStep.UPLOAD && activeTab === 'scan' && (
            <button onClick={reset} className="text-emerald-600 font-bold text-sm mb-1">Nueva</button>
          )}
        </div>
      </header>

      <div className="main-content px-5">
        <div className="animate-ios">
          {activeTab === 'scan' && (
            <>
              {step === AppStep.UPLOAD && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 py-10">
                  <div className="bg-emerald-100 p-6 rounded-full text-emerald-600 shadow-inner">
                    <Camera size={48} />
                  </div>
                  <div className="text-center space-y-4">
                    <h2 className="text-xl font-bold px-10">Haz una foto a lo que quieras vender</h2>
                    <label className="block active:scale-95 transition-transform">
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      <div className="bg-black text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl">
                        Empezar Ahora
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {step === AppStep.DETAILS && image && (
                <div className="space-y-6">
                  <img src={image} className="w-full rounded-3xl shadow-lg aspect-square object-cover" />
                  <div className="ios-card p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">App</label>
                        <select className="w-full p-4 rounded-xl bg-gray-50 font-bold text-sm appearance-none border-none focus:ring-2 focus:ring-emerald-500" value={details.platform} onChange={e => setDetails({...details, platform: e.target.value})}>
                          <option>Wallapop</option>
                          <option>Vinted</option>
                          <option>Milanuncios</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Precio Mín</label>
                        <input type="number" className="w-full p-4 rounded-xl bg-gray-50 font-bold text-sm border-none focus:ring-2 focus:ring-emerald-500" value={details.minPrice} onChange={e => setDetails({...details, minPrice: e.target.value})} placeholder="€"/>
                      </div>
                    </div>
                    <Button className="w-full py-5 text-lg font-black rounded-2xl shadow-emerald-100 shadow-lg" onClick={runAnalysis}>OPTIMIZAR ANUNCIO</Button>
                  </div>
                </div>
              )}

              {step === AppStep.ANALYZING && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
                  <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p className="font-bold text-gray-500 animate-pulse">CREANDO ESTRATEGIA...</p>
                </div>
              )}

              {step === AppStep.RESULTS && analysis && (
                <div className="space-y-6">
                  <div className="ios-card overflow-hidden">
                    <img src={enhancedImage || image!} className="w-full aspect-square object-cover" />
                    {!enhancedImage && (
                      <button onClick={handleEnhance} className="w-full py-4 text-xs font-black text-indigo-600 uppercase flex items-center justify-center gap-2">
                        <Sparkles size={14} /> Mejorar Fondo con IA
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {parseSections(analysis.fullAnalysis).map((section, idx) => (
                      <div key={idx} className="ios-card overflow-hidden">
                        <div className={`p-4 flex justify-between items-center ${section.isChat ? 'bg-indigo-600' : section.isPlainText ? 'bg-emerald-600' : 'bg-gray-50'} text-white`}>
                          <span className="text-[10px] font-black uppercase tracking-widest">{section.title.replace('(TEXTO PLANO)', '')}</span>
                          <button onClick={() => copyToClipboard(section.content, `s-${idx}`)} className="p-2 bg-white/20 rounded-full active:scale-75 transition-transform">
                            {copiedId === `s-${idx}` ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                        <div className="p-5">
                          {section.isPlainText ? (
                            <div className={`p-4 rounded-xl text-sm font-bold font-mono whitespace-pre-wrap leading-tight ${section.isChat ? 'bg-indigo-50 text-indigo-900' : 'bg-gray-50 text-gray-800'}`}>
                              {section.content}
                            </div>
                          ) : (
                            <div className="text-sm font-medium text-gray-700">
                              {renderFormattedContent(section.content)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-gray-400">
                  <LayoutGrid size={48} className="mb-4 opacity-20" />
                  <p className="font-bold">No hay ventas guardadas</p>
                </div>
              ) : (
                history.map(item => (
                  <div key={item.id} onClick={() => { loadFromHistory(item); setActiveTab('scan'); }} className="ios-card p-3 flex items-center gap-4 active:bg-gray-50">
                    <img src={item.enhancedImage || item.image} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1 truncate">
                      <p className="font-bold text-sm truncate">{item.analysis.fullAnalysis.match(/📝 TÍTULO OPTIMIZADO.*\n(.*)/)?.[1] || 'Sin título'}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{item.details.platform} • {new Date(item.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="space-y-6">
              <div className="ios-card p-6 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
                <h3 className="text-xl font-black mb-2">Truco Pro #1</h3>
                <p className="text-sm font-medium opacity-90 leading-relaxed">Sube los anuncios los domingos a partir de las 19:00. Es cuando hay más gente buscando y tu anuncio aparecerá arriba del todo.</p>
              </div>
              <div className="ios-card p-6">
                <h3 className="text-lg font-black mb-3 flex items-center gap-2"><Zap size={20} className="text-yellow-500"/> Regla de Oro</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Nunca aceptes la primera oferta. El comprador siempre está dispuesto a subir un 10% si le dices que "ya tienes a otra persona interesada de camino".</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="bottom-nav">
        <button onClick={() => goToTab('scan')} className={`nav-item ${activeTab === 'scan' ? 'active' : ''}`}>
          <Camera size={24} color={activeTab === 'scan' ? '#10b981' : '#8e8e93'} />
          <span>Vender</span>
        </button>
        <button onClick={() => goToTab('history')} className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}>
          <LayoutGrid size={24} color={activeTab === 'history' ? '#10b981' : '#8e8e93'} />
          <span>Historial</span>
        </button>
        <button onClick={() => goToTab('tips')} className={`nav-item ${activeTab === 'tips' ? 'active' : ''}`}>
          <TrendingUp size={24} color={activeTab === 'tips' ? '#10b981' : '#8e8e93'} />
          <span>Consejos</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
