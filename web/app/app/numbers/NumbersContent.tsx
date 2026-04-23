'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Smartphone, 
  Copy, 
  Check, 
  Pencil, 
  Trash2, 
  Bot, 
  Zap, 
  MessageSquare,
  LayoutGrid,
  List,
  RefreshCw,
  X,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { updateSlotLabel, toggleForwarding, releaseNumber } from '@/actions/dashboardActions';
import { useRouter } from 'next/navigation';
import { getIsoCodeFromCountry, getCountryName } from '@/utils/phoneUtils';

interface NumbersContentProps {
  initialData: {
    slots: any[];
  }
}

const REGION_FLAGS: Record<string, string> = {
  CL: '🇨🇱', AR: '🇦🇷', MX: '🇲🇽', US: '🇺🇸', BR: '🇧🇷',
  CO: '🇨🇴', PE: '🇵🇪', ES: '🇪🇸', DE: '🇩🇪', GB: '🇬🇧',
};

export default function NumbersContent({ initialData }: NumbersContentProps) {
  const router = useRouter();
  const [view, setView] = useState<'card' | 'list'>('card');
  const [slots, setSlots] = useState(initialData.slots);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredSlots = useMemo(() => slots.filter((slot: any) => 
    slot.phoneNumber.includes(search) || 
    (slot.label && slot.label.toLowerCase().includes(search.toLowerCase()))
  ), [slots, search]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveLabel = async (slotId: string) => {
    setLoadingId(`label-${slotId}`);
    try {
      await updateSlotLabel(slotId, labelDraft);
      setSlots(slots.map((s: any) => s.slotId === slotId ? { ...s, label: labelDraft } : s));
      setEditingId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleFwd = async (slotId: string, current: boolean) => {
    setLoadingId(`fwd-${slotId}`);
    try {
      await toggleForwarding(slotId, !current);
      setSlots(slots.map((s: any) => s.slotId === slotId ? { ...s, forwardingActive: !current } : s));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header / Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
            Mis Números<span className="text-primary not-italic">.</span>
          </h1>
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mt-1">
            {slots.length} SIMs activas bajo tu gestión
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 group-focus-within:text-primary transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Buscar número..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 pr-4 py-2.5 bg-[var(--card)] border border-slate-200 dark:border-slate-800 rounded-xl text-[12px] font-bold outline-none focus:border-primary/30 shadow-[var(--shadow)] transition-all w-56 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white"
            />
          </div>

          {/* View Toggle - Legacy Mirror */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-[var(--card)] shadow-[var(--shadow)] transition-colors">
            <button 
              onClick={() => setView('card')}
              className={`p-2.5 transition-all ${view === 'card' ? 'bg-primary text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setView('list')}
              className={`p-2.5 transition-all ${view === 'list' ? 'bg-primary text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              <List size={16} />
            </button>
          </div>

          <Link 
            href="/onboarding/plan"
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={14} /> Nueva SIM
          </Link>
        </div>
      </div>

      {/* Main Content */}
      {filteredSlots.length === 0 ? (
        <div className="py-32 text-center bg-[var(--card)] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-[var(--shadow)]">
           <Smartphone className="mx-auto text-slate-200 dark:text-slate-800 mb-4" size={48} />
           <p className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest italic">No se han encontrado resultados</p>
        </div>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredSlots.map((slot: any) => (
            <SimCard 
              key={slot.slotId} 
              slot={slot}
              isLoading={loadingId?.includes(slot.slotId)}
              isEditing={editingId === slot.slotId}
              labelDraft={labelDraft}
              onEdit={() => { setEditingId(slot.slotId); setLabelDraft(slot.label || ''); }}
              onSave={() => handleSaveLabel(slot.slotId)}
              onCancel={() => setEditingId(null)}
              onSetDraft={setLabelDraft}
              onToggleFwd={() => handleToggleFwd(slot.slotId, slot.forwardingActive)}
              onCopy={() => handleCopy(slot.phoneNumber, slot.slotId)}
              isCopied={copiedId === slot.slotId}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-[var(--shadow)]">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-black uppercase tracking-[0.2em] bg-slate-50 dark:bg-slate-950/20">
                <th className="px-6 py-4">Número</th>
                <th className="px-6 py-4">Etiqueta</th>
                <th className="px-6 py-4">Región</th>
                <th className="px-6 py-4">Plan / Uso</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlots.map((slot: any) => (
                <ListRow 
                  key={slot.slotId} 
                  slot={slot} 
                  isEditing={editingId === slot.slotId}
                  labelDraft={labelDraft}
                  onEdit={() => { setEditingId(slot.slotId); setLabelDraft(slot.label || ''); }}
                  onSave={() => handleSaveLabel(slot.slotId)}
                  onCancel={() => setEditingId(null)}
                  onSetDraft={setLabelDraft}
                  isLoading={loadingId?.includes(slot.slotId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SimCard({ slot, isLoading, isEditing, labelDraft, onEdit, onSave, onCancel, onSetDraft, onToggleFwd, onCopy, isCopied }: any) {
  const plan = (slot.activeSubscription?.planName || 'starter').toLowerCase();
  const ps = getLegacyPlanStyle(plan);
  const usagePct = Math.min(100, ((slot.activeSubscription?.creditsUsed || 0) / (slot.activeSubscription?.monthlyLimit || 150)) * 100);

  return (
    <div className="flex flex-col gap-3 group animate-in zoom-in duration-500">
      {/* Physical SIM Card Shape */}
      <div 
        className={`relative w-full aspect-[1.58/1] ${ps.cardBg} p-6 flex flex-col justify-between overflow-hidden shadow-2xl transition-transform duration-700 hover:-rotate-1`}
        style={{ 
          clipPath: 'polygon(8px 0, calc(100% - 36px) 0, 100% 36px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 calc(50% + 22px), 7px calc(50% + 22px), 7px calc(50% - 22px), 0 calc(50% - 22px), 0 8px)' 
        }}
      >
        {/* Card Holographic Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50 pointer-events-none" />
        
        <div className="flex items-start justify-between relative z-10">
          <div className="flex-1 min-w-0 pr-4">
            <p className={`text-[8px] font-black uppercase tracking-[0.25em] opacity-60 ${ps.labelColor}`}>Red Telsim Online</p>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <input 
                  autoFocus
                  value={labelDraft}
                  onChange={(e) => onSetDraft(e.target.value)}
                  className="w-full px-2 py-1 bg-white/20 border border-white/30 rounded-lg text-xs font-black uppercase text-white outline-none focus:bg-white/30 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSave();
                    if (e.key === 'Escape') onCancel();
                  }}
                />
                <button onClick={onSave} className="p-1 hover:scale-110 transition-transform text-white"><Check size={14} /></button>
                <button onClick={onCancel} className="p-1 hover:scale-110 transition-transform text-white/70"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/label">
                <h3 className={`text-sm font-black italic uppercase truncate ${ps.phoneColor}`}>
                  {slot.label || 'SIN ETIQUETA'}
                </h3>
                <button 
                  onClick={onEdit}
                  className="opacity-0 group-hover/label:opacity-100 transition-opacity p-1"
                >
                  <Pencil size={12} className={`${ps.phoneColor} opacity-60 hover:opacity-100`} />
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
             <div className="w-10 h-7 rounded-lg border-2 border-white/30 overflow-hidden bg-slate-200">
                <img src={`https://flagcdn.com/w80/${getIsoCodeFromCountry(slot.country).toLowerCase()}.png`} className="w-full h-full object-cover" alt="" />
             </div>
             <span className={`text-[10px] font-black font-mono ${ps.phoneColor}`}>#{slot.slotId.slice(-4).toUpperCase()}</span>
          </div>
        </div>

        <div className="flex items-center gap-5 relative z-10">
           {/* SIM Chip Visual */}
           <div className={`w-14 h-10 rounded-lg ${ps.chip} shadow-inner flex-shrink-0 flex items-center justify-center p-1.5`}>
              <div className="w-full h-full border border-black/10 rounded flex flex-col justify-between p-1">
                 <div className="h-0.5 w-full bg-black/5" />
                 <div className="h-0.5 w-full bg-black/5" />
                 <div className="h-0.5 w-full bg-black/5" />
              </div>
           </div>
           
           <div className="flex-1">
              <p className={`text-[8px] font-bold uppercase opacity-60 mb-1 ${ps.labelColor}`}>Número de Suscriptor</p>
              <p className={`text-[20px] font-black font-mono tracking-wider tabular-nums ${ps.phoneColor}`}>
                {formatPhoneNumber(slot.phoneNumber)}
              </p>
              
              {/* Usage Progress */}
              <div className="mt-3 max-w-[140px]">
                <div className="flex justify-between text-[7px] font-black mb-1 uppercase opacity-80">
                   <span className={ps.labelColor}>Consumo SMS</span>
                   <span className={ps.phoneColor}>{slot.activeSubscription?.creditsUsed || 0} / {slot.activeSubscription?.monthlyLimit || 150}</span>
                </div>
                <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
                   <div className={`h-full ${plan === 'starter' ? 'bg-primary' : 'bg-white'}`} style={{ width: `${usagePct}%` }} />
                </div>
              </div>
           </div>
        </div>

        <div className="flex items-end justify-between relative z-10">
           <div className="flex flex-col gap-0.5">
             <span className={`px-2 py-0.5 rounded-full border border-white/20 bg-black/20 text-[8px] font-black uppercase w-fit ${ps.phoneColor}`}>
               {ps.label}
             </span>
             <span className={`text-[8px] font-bold opacity-60 ${ps.labelColor}`}>💳 Plan {slot.activeSubscription?.billingType === 'annual' ? 'Anual' : 'Mensual'}</span>
           </div>
           
           <div className="text-right">
              <span className={`block text-[9px] font-black ${ps.phoneColor}`}>● ACTIVA</span>
              <span className={`block text-[8px] opacity-60 font-mono ${ps.labelColor}`}>Exp: {slot.activeSubscription?.currentPeriodEnd ? new Date(slot.activeSubscription.currentPeriodEnd).toLocaleDateString() : '—'}</span>
           </div>
        </div>
      </div>

      {/* SIM Quick Actions Bar */}
      <div className="bg-[var(--card)] p-2 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-1 shadow-[var(--shadow)] transition-colors">
         <Link href={`/app/messages?num=${slot.phoneNumber}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-primary hover:text-white transition-all">
            <MessageSquare size={14} /> Inbox
         </Link>
         <button onClick={onCopy} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isCopied ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100'}`}>
            {isCopied ? <Check size={14} /> : <Copy size={14} />}
         </button>
         <button onClick={onToggleFwd} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${slot.forwardingActive ? 'bg-sky-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
            {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
         </button>
      </div>
    </div>
  );
}

function ListRow({ slot, isEditing, labelDraft, onEdit, onSave, onCancel, onSetDraft, isLoading }: any) {
  const isoCode = getIsoCodeFromCountry(slot.country);
  const flag = REGION_FLAGS[isoCode.toUpperCase()] ?? '🌐';
  
  return (
    <tr className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
      <td className="px-6 py-4">
        <span className="text-[13px] font-black font-mono tracking-tight text-slate-900 dark:text-white">
          {formatPhoneNumber(slot.phoneNumber)}
        </span>
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input 
              autoFocus
              value={labelDraft}
              onChange={(e) => onSetDraft(e.target.value)}
              className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-bold outline-none focus:border-primary/50"
            />
            <button onClick={onSave} className="text-primary hover:scale-110 transition-transform"><Check size={14} /></button>
            <button onClick={onCancel} className="text-slate-600 dark:text-slate-400 hover:scale-110 transition-transform"><X size={14} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
             <span className="text-xs font-bold text-slate-700 dark:text-slate-400">{slot.label || '—'}</span>
             <button onClick={onEdit} className="opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={12} className="text-slate-500 dark:text-slate-600" /></button>
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        <span className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-400 italic">
          {flag} {getCountryName(slot.country)}
        </span>
      </td>
      <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-400">
        Plan {slot.activeSubscription?.planName || 'Start'}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1.5">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Activo</span>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <Link href={`/app/messages?num=${slot.phoneNumber}`} className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors p-2">
           <ArrowUpRight size={16} />
        </Link>
      </td>
    </tr>
  );
}

function getLegacyPlanStyle(plan: string) {
  if (plan.includes('power')) return {
    cardBg: 'bg-gradient-to-br from-[#B49248] via-[#D4AF37] to-[#8C6B1C]',
    phoneColor: 'text-white',
    labelColor: 'text-white/80',
    chip: 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-100',
    label: 'POWER'
  };
  if (plan.includes('pro')) return {
    cardBg: 'bg-gradient-to-br from-[#0047FF] via-[#0094FF] to-[#00C8FF]',
    phoneColor: 'text-white',
    labelColor: 'text-white/80',
    chip: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500',
    label: 'PRO'
  };
  // Starter / Default
  return {
    cardBg: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
    phoneColor: 'text-slate-900 dark:text-white',
    labelColor: 'text-slate-400 dark:text-slate-500',
    chip: 'bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900',
    label: 'START'
  };
}

function formatPhoneNumber(raw: string) {
  const clean = raw.replace(/\D/g, '');
  if (clean.startsWith('569') && clean.length === 11) {
    return `+56 9 ${clean.slice(3, 7)} ${clean.slice(7)}`;
  }
  return raw.startsWith('+') ? raw : `+${raw}`;
}
