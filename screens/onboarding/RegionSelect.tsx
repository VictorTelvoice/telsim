import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RegionSelect: React.FC = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>('CL');

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 p-6 pt-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors text-slate-900 dark:text-white">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
        </div>
        <div className="w-10 h-10"></div> 
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-8 -mt-10">
        <div className="relative w-48 h-48 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 ring-1 ring-blue-100 dark:ring-slate-700">
          <div className="absolute inset-0 rounded-full border border-blue-100/50 scale-125"></div>
          
          {/* Floating Flags */}
          <div className="absolute top-0 right-10 bg-white dark:bg-slate-700 p-2 rounded-xl shadow-lg animate-bounce" style={{ animationDuration: '3s' }}>
            <span className="text-xl">🇨🇱</span>
          </div>
          <div className="absolute bottom-4 left-6 bg-white dark:bg-slate-700 p-2 rounded-xl shadow-lg animate-bounce" style={{ animationDuration: '4s' }}>
            <span className="text-xl">🇦🇷</span>
          </div>
          
          <span className="material-symbols-outlined text-[80px] text-primary">public</span>
          
          <div className="absolute top-1/3 left-1/3 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
          <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        </div>

        <div className="space-y-4 max-w-xs">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Paso 1: <br/>Elige tu región
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-[15px] leading-relaxed">
            Selecciona entre Chile, Argentina o Perú para obtener un número local físico y real.
          </p>
        </div>

        <div className="w-full grid grid-cols-3 gap-3 mt-4">
          <button 
            onClick={() => setSelected('CL')}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${selected === 'CL' ? 'border-primary bg-blue-50/50 dark:bg-blue-900/20 text-primary' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60 hover:opacity-100'}`}
          >
            <span className="text-2xl">🇨🇱</span>
            <span className="text-sm font-bold">Chile</span>
          </button>
          
          <button 
            onClick={() => setSelected('AR')}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${selected === 'AR' ? 'border-primary bg-blue-50/50 dark:bg-blue-900/20 text-primary' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60 hover:opacity-100'}`}
          >
            <span className="text-2xl">🇦🇷</span>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Arg</span>
          </button>
          
          <button 
            onClick={() => setSelected('PE')}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${selected === 'PE' ? 'border-primary bg-blue-50/50 dark:bg-blue-900/20 text-primary' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60 hover:opacity-100'}`}
          >
            <span className="text-2xl">🇵🇪</span>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Perú</span>
          </button>
        </div>
      </div>

      <div className="mt-auto pt-8">
        <button 
          onClick={() => navigate('/onboarding/plan')}
          className="group w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold h-16 rounded-2xl shadow-button flex items-center justify-between px-2 relative overflow-hidden"
        >
          <div className="w-12"></div> 
          <span className="text-[17px] tracking-wide">Siguiente</span>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <span className="material-symbols-outlined text-white">arrow_forward</span>
          </div>
        </button>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 font-medium">
          Paso 1 de 3
        </p>
      </div>
    </div>
  );
};

export default RegionSelect;