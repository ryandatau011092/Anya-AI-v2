
import React, { useState, useRef } from 'react';
import { AgentConfig } from '../types';

interface SetupViewProps {
  config: AgentConfig;
  setConfig: (config: AgentConfig) => void;
  onStart: () => void;
  onReset: () => void;
  onClose?: () => void;
}

const SetupView: React.FC<SetupViewProps> = ({ config, setConfig, onStart, onReset, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setConfig({ ...config, profilePic: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleBgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setConfig({ ...config, background: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const bgOptions = [
    { id: 12, url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600' },
    { id: 10, url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=600' },
    { id: 11, url: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600' },
    { id: 13, url: 'https://images.unsplash.com/photo-1501691223387-dd0500403074?q=80&w=600' }
  ];

  const isCustomBg = config.background.startsWith('data:') || !bgOptions.some(opt => opt.url === config.background);
  const glassOpacity = Math.max(0.1, config.transparency / 100);

  return (
    <div className="w-[95%] max-w-4xl h-full py-4 md:py-8 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 overflow-hidden relative">
      <div 
        className="w-full h-fit max-h-full border border-white/20 rounded-[40px] md:rounded-[50px] p-6 md:p-10 shadow-2xl transition-all duration-300 relative overflow-y-auto custom-scrollbar flex flex-col"
        style={{ 
          backgroundColor: `rgba(0, 0, 0, ${glassOpacity})`,
          backdropFilter: `blur(${config.blur}px)`,
          WebkitBackdropFilter: `blur(${config.blur}px)`
        }}
      >
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 text-white/40 hover:text-white z-20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <header className="text-center mb-8 shrink-0">
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-white drop-shadow-lg">
            {config.name || 'Agent'} Setup
          </h1>
          <p className="text-pink-500 font-bold uppercase text-[9px] tracking-[0.4em] mt-2 opacity-80">Konfigurasi AI Voice Agent</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 overflow-visible">
          {/* SECTION 1: IDENTITY */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="w-1 h-4 bg-pink-500 rounded-full"></div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Identitas Utama</h2>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[35px] space-y-6 shadow-inner">
              <div className="flex flex-col items-center gap-4">
                <div 
                  className={`relative group p-1 transition-all duration-300 ${isDragging ? 'scale-105' : ''}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                >
                  <div className={`w-32 h-32 md:w-44 md:h-44 rounded-[45px] overflow-hidden border-2 shadow-2xl bg-black/40 transition-all duration-500 ${isDragging ? 'border-pink-500' : 'border-white/20'}`}>
                    {config.profilePic ? (
                      <img src={config.profilePic} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-pink-500/30">
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 bg-pink-600 p-3 rounded-xl cursor-pointer hover:bg-pink-500 transition-all z-10 shadow-lg border border-black/20">
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest ml-4">Nama Agen</label>
                  <input 
                    type="text" 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:ring-1 ring-pink-500/40 font-bold transition-all text-white text-base" 
                    value={config.name} 
                    onChange={(e) => setConfig({ ...config, name: e.target.value })} 
                    placeholder="Nama Agen..." 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest ml-4">Personality</label>
                  <textarea 
                    className="w-full h-24 bg-black/30 border border-white/10 rounded-[25px] px-5 py-4 outline-none focus:ring-1 ring-pink-500/40 resize-none text-xs font-medium leading-relaxed custom-scrollbar text-white/80" 
                    value={config.personality} 
                    onChange={(e) => setConfig({ ...config, personality: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: AUDIO & VISUAL */}
          <section className="space-y-6">
             <div className="flex items-center gap-3 px-2">
              <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Suara & Tema</h2>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[35px] space-y-5 shadow-inner">
              <div className="space-y-1.5">
                <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest ml-4">Karakter Suara</label>
                <select 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 outline-none font-bold text-sm text-white appearance-none" 
                  value={config.voice} 
                  onChange={(e) => setConfig({ ...config, voice: e.target.value })}
                >
                  <option value="Kore">Ceria (Kore)</option>
                  <option value="Puck">Deep (Puck)</option>
                  <option value="Charon">Elegan (Charon)</option>
                  <option value="Zephyr">Ramah (Zephyr)</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest ml-4">Wallpaper</label>
                <div className="flex gap-3 overflow-x-auto pb-2 px-1 custom-scrollbar">
                  {bgOptions.map(bg => (
                    <button 
                      key={bg.id} 
                      onClick={() => setConfig({...config, background: bg.url})} 
                      className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 transition-all ${config.background === bg.url ? 'border-pink-500 scale-105' : 'border-white/5 opacity-50'}`}
                    >
                      <img src={bg.url} className="w-full h-full object-cover rounded-lg" />
                    </button>
                  ))}
                  <div className="flex-shrink-0">
                    <input type="file" className="hidden" accept="image/*" ref={bgInputRef} onChange={handleBgFile} />
                    <button 
                      onClick={() => bgInputRef.current?.click()}
                      className={`w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center ${isCustomBg ? 'border-pink-500' : 'border-white/10'}`}
                    >
                       <svg className="h-5 w-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-1">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase text-white/40 tracking-widest">
                    <span>Blur</span>
                    <span className="text-pink-500">{config.blur}px</span>
                  </div>
                  <input type="range" min="0" max="40" className="w-full accent-pink-500 h-1 bg-white/10 rounded-full appearance-none" value={config.blur} onChange={(e) => setConfig({...config, blur: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase text-white/40 tracking-widest">
                    <span>Dim</span>
                    <span className="text-pink-500">{config.transparency}%</span>
                  </div>
                  <input type="range" min="0" max="100" className="w-full accent-pink-500 h-1 bg-white/10 rounded-full appearance-none" value={config.transparency} onChange={(e) => setConfig({...config, transparency: parseInt(e.target.value)})} />
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-3 pb-4">
               <button 
                onClick={onStart} 
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-all uppercase tracking-[0.3em] text-xs border border-white/10"
              >
                Mulai Chat
              </button>
              <button 
                onClick={onReset} 
                className="w-full text-[8px] font-bold uppercase tracking-[0.2em] text-white/10 hover:text-red-400 transition-colors py-1"
              >
                Reset Database
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SetupView;
