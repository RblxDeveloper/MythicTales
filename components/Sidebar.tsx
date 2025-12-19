
import React from 'react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const menuItems = [
    { id: 'generator' as View, icon: '✍️', label: 'CREATE', desc: 'New story' },
    { id: 'library' as View, icon: '📚', label: 'COLLECTION', desc: 'Saved books' },
  ];

  return (
    <>
      {/* Mobile Top Navigation - Clean white bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-2xl z-50 border-b border-slate-100 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-lg shadow-lg shrink-0">📖</div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-tighter leading-none text-[#0d1117]">MYTHOS</span>
            <span className="text-[6px] font-black uppercase tracking-[0.2em] text-slate-300 leading-none mt-1">Personal Edition</span>
          </div>
        </div>
        <div className="flex gap-2">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all ${currentView === item.id ? 'bg-[#0d1117] text-white shadow-xl' : 'text-slate-400 grayscale opacity-40'}`}
            >
              <span className="text-sm">{item.icon}</span>
              <span className="text-[8px] font-black tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Monochrome Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-50 h-screen flex-col p-10 fixed left-0 top-0 z-40">
        <div className="flex flex-col items-center text-center mb-20">
          <div className="w-14 h-14 bg-black rounded-[1.25rem] flex items-center justify-center text-2xl shadow-2xl shrink-0 border-4 border-white mb-4">
            <span className="drop-shadow-sm">📖</span>
          </div>
          <h1 className="font-black text-2xl tracking-tighter text-black leading-none uppercase">MYTHOS</h1>
          <p className="text-[8px] uppercase font-black text-slate-300 tracking-[0.4em] mt-2 leading-none">Personal Edition</p>
        </div>

        <nav className="space-y-6 flex-grow">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center gap-4 px-6 py-5 rounded-[2.5rem] transition-all group relative 
                ${currentView === item.id 
                  ? 'bg-black text-white shadow-2xl scale-[1.02]' 
                  : 'hover:bg-slate-50 text-slate-300 grayscale opacity-40 hover:opacity-100'}
              `}
            >
              <span className={`text-2xl transition-transform duration-500 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <div className="text-left">
                <span className="font-black text-[10px] tracking-[0.2em]">{item.label}</span>
                <p className={`text-[8px] font-bold mt-0.5 tracking-tight ${currentView === item.id ? 'text-slate-500' : 'text-slate-200'}`}>{item.desc}</p>
              </div>
              {currentView === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-full ml-1.5" />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="p-8 rounded-[2.5rem] bg-[#f8f9fb] text-center relative overflow-hidden group">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-lg">💡</div>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Quotation</p>
            <p className="text-[10px] text-slate-500 font-bold italic font-crimson leading-relaxed px-1">
              "Great legends aren't written; they are manifested."
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
