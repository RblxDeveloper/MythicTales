
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import { 
  Story, 
  View, 
  Genre, 
  Mood, 
  StoryStyle,
  CastMember, 
  Voice 
} from './types';
import { generateStoryContent, generateImageForPage, generateNarration } from './geminiService';
import { exportToPDF } from './components/PDFExporter';
import Sidebar from './components/Sidebar';

const DB_NAME = 'MythosPersonalArchives';
const STORE_NAME = 'chronicles';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (e: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveToDB = async (story: Story) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(story);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const getFromDB = async (): Promise<Story[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const removeFromDB = async (id: string) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve(true);
  });
};

const Dropdown = ({ label, value, options, onChange }: { label?: string, value: string, options: string[], onChange: (val: any) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClick = (e: MouseEvent) => { 
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); 
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="flex flex-col gap-2 mb-5" ref={containerRef}>
      {label && (
        <label className="text-[10px] font-extrabold text-[#94a3b8] uppercase tracking-[0.15em] ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className={`w-full bg-[#f8fafc] text-[#0f172a] px-5 py-4 rounded-[1.25rem] flex items-center justify-between font-bold text-[12px] transition-all border border-transparent hover:bg-white hover:border-slate-200 ${isOpen ? 'bg-white border-slate-200 shadow-sm' : ''}`}
        >
          <span className="tracking-wide">{value.toUpperCase()}</span>
          <svg 
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#0d1117]' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white shadow-[0_15px_35px_-10px_rgba(0,0,0,0.12)] rounded-[1.25rem] border border-slate-100 overflow-hidden z-[150] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-h-64 overflow-y-auto no-scrollbar">
              {options.map((opt) => (
                <button 
                  key={opt} 
                  onClick={() => { onChange(opt); setIsOpen(false); }} 
                  className={`w-full text-left px-6 py-4 text-[11px] font-black tracking-widest transition-all ${value === opt ? 'bg-[#0d1117] text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-[#0d1117]'}`}
                >
                  {opt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [view, setView] = useState<View>('generator');
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0, step: '' });
  const [isNarrating, setIsNarrating] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const [genre, setGenre] = useState<Genre>(Genre.Fantasy);
  const [mood, setMood] = useState<Mood>(Mood.Epic);
  const [style, setStyle] = useState<StoryStyle>(StoryStyle.OilPainting);
  const [voice, setVoice] = useState<Voice>(Voice.Male);
  const [pageCount, setPageCount] = useState(5);
  const [plot, setPlot] = useState('');
  const [cast, setCast] = useState<CastMember[]>([{ id: '1', name: '', role: '' }]);

  useEffect(() => {
    getFromDB().then(data => setStories(data.sort((a, b) => b.createdAt - a.createdAt)));
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenProgress({ current: 0, total: pageCount, step: 'Drafting narrative...' });
    try {
      const result = await generateStoryContent(genre, mood, pageCount, cast, plot, style);
      const newStory: Story = {
        id: Date.now().toString(),
        title: result.title,
        genre, mood, style, plot, cast,
        pages: [],
        createdAt: Date.now(),
        isFavorite: false
      };
      const finalPages = [];
      for(let i = 0; i < result.pages.length; i++) {
        setGenProgress({ current: i + 1, total: pageCount, step: `Chapter ${i + 1} of ${pageCount}...` });
        const imgUrl = await generateImageForPage(result.pages[i].imagePrompt, genre);
        const audio = await generateNarration(result.pages[i].text, voice);
        finalPages.push({ ...result.pages[i], imageUrl: imgUrl, audioData: audio });
      }
      newStory.pages = finalPages;
      await saveToDB(newStory);
      setStories([newStory, ...stories]);
      setActiveStory(newStory);
      setView('reader');
    } catch (e) { alert("Manifestation failed. Please try again later."); }
    finally { setIsGenerating(false); }
  };

  const deleteStory = async (id: string) => {
    if (confirm("Delete this chronicle?")) {
      await removeFromDB(id);
      setStories(stories.filter(s => s.id !== id));
      if (activeStory?.id === id) setView('library');
    }
  };

  const removeCastMember = (id: string) => {
    if (cast.length > 1) {
      setCast(cast.filter(c => c.id !== id));
    }
  };

  const renderGenerator = () => (
    <div className="max-w-7xl mx-auto py-10 px-8 lg:px-12 pt-28 lg:pt-16 flex flex-col gap-10 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Left: Configuration Panel */}
        <div className="lg:col-span-4 modern-card p-10 flex flex-col animate-slide-up bg-white shadow-xl border-slate-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[#0d1117] rounded-[1.25rem] flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-[#0d1117]">Configuration</h2>
          </div>

          <div className="flex flex-col">
            <Dropdown label="Genre" value={genre} options={Object.values(Genre)} onChange={setGenre} />
            <Dropdown label="Mood" value={mood} options={Object.values(Mood)} onChange={setMood} />
            <Dropdown label="Art Style" value={style} options={Object.values(StoryStyle)} onChange={setStyle} />
            <Dropdown label="Voice" value={voice} options={Object.values(Voice)} onChange={setVoice} />
          </div>

          <div className="mt-2 mb-8">
            <div className="flex justify-between items-center mb-5">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Length</span>
              <span className="bg-[#0d1117] text-white px-4 py-1 rounded-xl text-[10px] font-black">{pageCount} Pages</span>
            </div>
            <div className="px-1">
              <input type="range" min="3" max="10" value={pageCount} onChange={(e) => setPageCount(parseInt(e.target.value))} />
            </div>
          </div>

          <button 
            onClick={handleGenerate} 
            className="w-full bg-[#0d1117] text-white py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.25em] shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98] mt-2"
          >
            Create Story
          </button>
        </div>

        {/* Right: Protagonists & Plot */}
        <div className="lg:col-span-8 flex flex-col gap-10">
          <div className="modern-card p-12 animate-slide-up bg-white shadow-xl border-slate-100" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-2xl font-black mb-10 tracking-tight text-[#0d1117]">Protagonists</h3>
            <div className="flex flex-col gap-6 mb-10">
              {cast.map((c, i) => (
                <div key={c.id} className="relative p-7 bg-[#f8fafc] border border-slate-100 rounded-[1.75rem] group animate-in fade-in slide-in-from-left-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Name</label>
                      <input 
                        placeholder="e.g. Orion" 
                        value={c.name} 
                        onChange={(e) => setCast(cast.map(char => char.id === c.id ? { ...char, name: e.target.value } : char))} 
                        className="w-full bg-white border border-slate-100 px-5 py-3.5 rounded-2xl font-bold text-[#0d1117] outline-none focus:border-black focus:ring-1 focus:ring-black/5 transition-all text-base placeholder:text-slate-200 shadow-sm" 
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Role</label>
                      <input 
                        placeholder="e.g. Brave Explorer" 
                        value={c.role} 
                        onChange={(e) => setCast(cast.map(char => char.id === c.id ? { ...char, role: e.target.value } : char))} 
                        className="w-full bg-white border border-slate-100 px-5 py-3.5 rounded-2xl font-bold text-[#0d1117] outline-none focus:border-black focus:ring-1 focus:ring-black/5 transition-all text-base placeholder:text-slate-200 shadow-sm" 
                      />
                    </div>
                  </div>
                  {cast.length > 1 && (
                    <button 
                      onClick={() => removeCastMember(c.id)}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-slate-100 text-slate-300 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-md opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={() => setCast([...cast, { id: Date.now().toString(), name: '', role: '' }])} 
              className="w-full py-5 border border-dashed border-slate-200 rounded-[2rem] font-black text-[11px] text-slate-400 uppercase tracking-[0.25em] hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-[0.99] shadow-sm"
            >
              + Add character
            </button>
          </div>

          <div className="modern-card p-12 animate-slide-up flex flex-col bg-white shadow-xl border-slate-100" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-2xl font-black mb-8 tracking-tight text-[#0d1117]">Starting Plot</h3>
            <div className="bg-[#f8fafc] p-8 rounded-[2rem] min-h-[250px] w-full border border-slate-50 flex flex-col focus-within:bg-white focus-within:border-slate-200 transition-all duration-300 shadow-sm">
              <textarea 
                placeholder="Give us a hook or leave it blank..." 
                value={plot} 
                onChange={(e) => setPlot(e.target.value)} 
                className="w-full h-full min-h-[180px] bg-transparent outline-none resize-none font-bold text-slate-600 text-base leading-relaxed placeholder:text-slate-300 no-scrollbar flex-grow" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLibrary = () => (
    <div className="max-w-6xl mx-auto py-12 px-6 lg:px-10 pt-24 lg:pt-16">
      <header className="mb-10 animate-slide-up">
        <h1 className="text-3xl font-black tracking-tight text-[#0d1117]">Collection</h1>
        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em] mt-1">Saved Books</p>
      </header>

      {stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 animate-slide-up text-center px-6 border-2 border-dashed border-slate-100 rounded-[2rem] bg-white/40">
          <div className="w-16 h-16 bg-white rounded-[1.25rem] flex items-center justify-center text-3xl mb-6 shadow-sm border border-slate-50">
            ✨
          </div>
          <h3 className="text-xl font-black tracking-tight text-[#0d1117]">Shelf empty</h3>
          <p className="text-slate-400 font-bold mt-2 text-sm max-w-xs leading-relaxed">
            Manifest your first chronicle to begin.
          </p>
          <button 
            onClick={() => setView('generator')} 
            className="mt-8 px-8 py-4 bg-[#0d1117] text-white rounded-[1.5rem] font-black text-[10px] tracking-[0.2em] uppercase shadow-lg hover:scale-105 transition-all"
          >
            Create Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stories.map((story, i) => (
            <div key={story.id} className="modern-card overflow-hidden flex flex-col group animate-slide-up bg-white shadow-sm border-slate-100" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="h-60 relative overflow-hidden bg-slate-50">
                <img src={story.pages[0]?.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s] ease-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="text-[9px] font-black tracking-[0.2em] uppercase opacity-60 mb-1.5 block">{story.genre}</span>
                  <h3 className="text-xl font-black line-clamp-2 leading-tight tracking-tight">{story.title}</h3>
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col gap-3">
                <button onClick={() => { setActiveStory(story); setView('reader'); }} className="w-full bg-[#0d1117] text-white py-3.5 rounded-[1rem] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform">Open Book</button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => exportToPDF(story)} className="bg-slate-50 text-slate-500 py-3 rounded-[1rem] font-black text-[8px] uppercase tracking-widest hover:bg-slate-100">PDF</button>
                  <button onClick={() => deleteStory(story.id)} className="bg-red-50 text-red-400 py-3 rounded-[1rem] font-black text-[8px] uppercase tracking-widest hover:bg-red-500 hover:text-white">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderReader = () => {
    const page = activeStory?.pages[currentPageIndex];
    if (!page) return null;
    return (
      <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in fade-in duration-700">
        <div className="h-16 border-b border-slate-50 px-6 flex items-center justify-between">
          <button onClick={() => setView('library')} className="text-slate-400 font-black text-[9px] tracking-[0.4em] uppercase hover:text-black transition-all">← Back</button>
          <h2 className="text-black font-black text-[10px] uppercase tracking-[0.3em] truncate px-4">{activeStory?.title}</h2>
          <button onClick={() => exportToPDF(activeStory!)} className="px-5 py-2 bg-[#0d1117] text-white rounded-full font-black text-[9px] tracking-widest uppercase shadow-lg">Export PDF</button>
        </div>
        <div className="flex-grow flex items-center justify-center p-4 lg:p-8">
          <div className="w-full h-full max-w-[1500px] max-h-[800px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-50 flex flex-col lg:flex-row overflow-hidden relative">
             <div className="w-full lg:w-1/2 h-2/5 lg:h-full bg-slate-50 overflow-hidden relative">
                <img src={page.imageUrl} className="w-full h-full object-cover animate-in fade-in duration-1000" />
                <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/20 to-transparent pointer-events-none hidden lg:block" />
             </div>
             <div className="w-full lg:w-1/2 h-3/5 lg:h-full p-8 lg:p-16 overflow-y-auto no-scrollbar paper-texture relative">
                <div className="flex justify-between items-center mb-8">
                   <span className="text-[9px] font-black text-slate-300 tracking-[0.5em] uppercase">Folio {currentPageIndex + 1}</span>
                   {page.audioData && (
                     <button onClick={() => {
                       if (isNarrating) { audioSourceRef.current?.stop(); setIsNarrating(false); }
                       else {
                          const ctx = new AudioContext();
                          const buf = new Uint8Array(atob(page.audioData!).split("").map(c => c.charCodeAt(0))).buffer;
                          ctx.decodeAudioData(buf).then(ab => {
                            const src = ctx.createBufferSource(); src.buffer = ab; src.connect(ctx.destination);
                            src.start(); setIsNarrating(true); src.onended = () => setIsNarrating(false);
                            audioSourceRef.current = src;
                          });
                       }
                     }} className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${isNarrating ? 'bg-[#0d1117] text-white scale-110' : 'bg-white text-black hover:scale-105 border border-slate-100'}`}>
                       {isNarrating ? (
                         <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                       ) : (
                         <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                       )}
                     </button>
                   )}
                </div>
                <div className="prose prose-lg prose-slate font-crimson text-[#0d1117] drop-cap leading-relaxed animate-in slide-in-from-bottom-2 duration-500">
                  <ReactMarkdown>{page.text}</ReactMarkdown>
                </div>
             </div>
          </div>
          <button disabled={currentPageIndex === 0} onClick={() => setCurrentPageIndex(p => p - 1)} className="absolute left-6 w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center text-xl font-black disabled:opacity-0 transition-all hover:scale-105 border border-slate-50">←</button>
          <button disabled={currentPageIndex === activeStory!.pages.length - 1} onClick={() => setCurrentPageIndex(p => p + 1)} className="absolute right-6 w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center text-xl font-black disabled:opacity-0 transition-all hover:scale-105 border border-slate-50">→</button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen lg:pl-64 bg-[#fcfcfc] overflow-visible">
      <Sidebar currentView={view} onViewChange={setView} />
      <main className="min-h-screen">
        {view === 'generator' && renderGenerator()}
        {view === 'library' && renderLibrary()}
        {view === 'reader' && renderReader()}
      </main>
      {isGenerating && (
        <div className="fixed inset-0 z-[500] bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-500">
          <div className="w-40 h-40 relative mb-12">
            <svg className="w-full h-full animate-spin duration-[4s]" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#f4f4f4" strokeWidth="2" />
              <circle cx="50" cy="50" r="46" fill="none" stroke="#0d1117" strokeWidth="4" strokeDasharray="100 200" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-5xl animate-pulse">📖</div>
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase mb-4 text-[#0d1117]">Manifesting...</h2>
          <p className="text-xl font-crimson italic text-slate-400 max-w-lg leading-relaxed px-6">"{genProgress.step}"</p>
        </div>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<App />);
