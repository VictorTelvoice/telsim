
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CreditCard, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Building2, 
  User,
  Loader2,
  Check,
  Info,
  X,
  Calendar,
  Hash,
  Receipt
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  method: string;
}

const Billing: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    // Mock data inicial
    const mockTransactions: Transaction[] = [
      { id: 'TX-778210', date: '2023-11-24T14:30:00', description: 'Suscripción Telsim Power (Pro)', amount: 99.00, status: 'pending', method: 'VISA •••• 4242' },
      { id: 'TX-778105', date: '2023-11-10T10:15:00', description: 'Suscripción Telsim Flex (Basic)', amount: 13.90, status: 'paid', method: 'VISA •••• 4242' },
      { id: 'TX-778002', date: '2023-10-24T09:45:00', description: 'Prueba Gratuita (15 días)', amount: 0.00, status: 'paid', method: 'VISA •••• 4242' },
    ];

    useEffect(() => {
        setTimeout(() => {
            setTransactions(mockTransactions);
            setLoading(false);
        }, 800);
    }, []);

    const showToast = (message: string) => {
        const toast = document.createElement('div');
        toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10";
        toast.innerHTML = `
            <div class="size-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span class="text-[11px] font-black uppercase tracking-widest">${message}</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    };

    const handleUpdateStatus = (id: string, currentStatus: string) => {
        if (currentStatus !== 'pending') return;
        setProcessingId(id);
        setTimeout(() => {
            setTransactions(prev => prev.map(tx => 
                tx.id === id ? { ...tx, status: 'paid' } : tx
            ));
            setProcessingId(null);
            showToast("Pago Procesado con Éxito");
        }, 2000);
    };

    const getStatusIcon = (status: Transaction['status'], id: string | null = null) => {
        if (id && processingId === id) {
            return <Loader2 className="size-4 text-primary animate-spin" />;
        }
        switch (status) {
            case 'paid': return <CheckCircle2 className="size-4 text-emerald-500" />;
            case 'failed': return <AlertCircle className="size-4 text-rose-500" />;
            case 'pending': return <Clock className="size-4 text-amber-500 animate-pulse" />;
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
    };

    const formatFullDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen relative bg-background-light dark:bg-background-dark font-display pb-32">
             <header className="flex items-center justify-between px-6 py-6 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                    <ArrowLeft className="size-5" />
                </button>
                <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Facturación</h1>
                <div className="w-10"></div>
            </header>

            <main className="px-5 py-8 space-y-8 max-w-lg mx-auto">
                
                {/* Datos de Facturación */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Datos de Facturación</h3>
                        <Building2 className="size-4 text-slate-300" />
                    </div>
                    <div className="bg-white dark:bg-surface-dark rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-soft relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-bl-[3rem] -z-0 opacity-50"></div>
                        <div className="relative z-10 flex flex-col gap-5">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-primary">
                                        <User className="size-5" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Titular / Empresa</p>
                                        <p className="text-sm font-extrabold text-slate-900 dark:text-white">{user?.user_metadata?.full_name || 'Usuario Telsim Pro'}</p>
                                    </div>
                                </div>
                                <button className="text-[10px] font-black text-primary dark:text-blue-400 uppercase tracking-widest hover:opacity-70">
                                    Editar
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Fiscal / RUT</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">12.345.678-9</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo Documento</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Persona Natural</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dirección Legal</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Av. Providencia 1208, Piso 4, Santiago, Chile</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Métodos de Pago */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Método de Pago</h3>
                    <div className="bg-white dark:bg-surface-dark rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-soft flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center shadow-inner overflow-hidden">
                                <span className="text-[8px] font-black italic text-blue-800 dark:text-blue-400">VISA</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">•••• 4242</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Vence 12/26</span>
                            </div>
                        </div>
                        <button className="text-[10px] font-black text-primary dark:text-blue-400 uppercase tracking-widest hover:opacity-70">
                            Cambiar
                        </button>
                    </div>
                </section>

                {/* Historial de Transacciones */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Historial de Pagos</h3>
                        <FileText className="size-4 text-slate-300" />
                    </div>

                    {loading ? (
                        <div className="py-12 flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando recibos...</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((tx) => (
                                <div 
                                    key={tx.id} 
                                    className={`bg-white dark:bg-surface-dark rounded-3xl p-5 border shadow-sm flex items-center justify-between transition-all group ${
                                        tx.status === 'pending' 
                                        ? 'border-amber-100 dark:border-amber-900/30' 
                                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`size-10 rounded-2xl flex items-center justify-center transition-colors ${
                                            tx.status === 'pending' 
                                            ? 'bg-amber-50 dark:bg-amber-900/20' 
                                            : 'bg-slate-50 dark:bg-slate-900 group-hover:bg-primary/10 group-hover:text-primary'
                                        }`}>
                                            {getStatusIcon(tx.status, tx.id)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-[13px] font-black tracking-tight leading-tight mb-0.5 ${tx.status === 'pending' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                                                {tx.description}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {formatDate(tx.date)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-sm font-black font-mono ${tx.status === 'pending' ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                                                ${tx.amount.toFixed(2)}
                                            </span>
                                            {tx.status === 'pending' && !processingId && (
                                                <button 
                                                    onClick={() => handleUpdateStatus(tx.id, tx.status)}
                                                    className="text-[8px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse"
                                                >
                                                    Pagar
                                                </button>
                                            )}
                                        </div>
                                        
                                        <button 
                                            onClick={() => setSelectedTransaction(tx)}
                                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                                            title="Ver Detalles"
                                        >
                                            <Info className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <div className="pt-10 flex flex-col items-center text-center opacity-30">
                    <span className="material-symbols-rounded text-3xl mb-2">verified_user</span>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Stripe Secure Payment v1.5</p>
                </div>
            </main>

            {/* Modal de Detalles de Transacción */}
            {selectedTransaction && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-lg animate-in fade-in duration-300"
                    onClick={() => setSelectedTransaction(null)}
                >
                    <div 
                        className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`p-8 pb-6 flex flex-col items-center text-center relative ${
                            selectedTransaction.status === 'paid' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                        }`}>
                            <button 
                                onClick={() => setSelectedTransaction(null)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-slate-400"
                            >
                                <X className="size-5" />
                            </button>
                            
                            <div className={`size-16 rounded-3xl flex items-center justify-center mb-4 shadow-sm border border-white/20 ${
                                selectedTransaction.status === 'paid' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                            }`}>
                                <Receipt className="size-8" />
                            </div>
                            
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Detalles del Pago</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Transacción TELSIM</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-5">
                                <div className="flex items-start gap-4">
                                    <div className="size-10 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 shrink-0">
                                        <Hash className="size-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID Transacción</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{selectedTransaction.id}</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="size-10 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 shrink-0">
                                        <FileText className="size-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedTransaction.description}</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="size-10 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 shrink-0">
                                        <Calendar className="size-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatFullDate(selectedTransaction.date)}</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="size-10 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 shrink-0">
                                        <CreditCard className="size-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Método de Pago</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{selectedTransaction.method}</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                        selectedTransaction.status === 'paid' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'
                                    }`}>
                                        {getStatusIcon(selectedTransaction.status)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
                                        <span className={`text-sm font-black uppercase tracking-widest ${
                                            selectedTransaction.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'
                                        }`}>
                                            {selectedTransaction.status === 'paid' ? 'Completado' : 'Pendiente'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Monto Total</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">
                                    ${selectedTransaction.amount.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                {selectedTransaction.status === 'paid' ? (
                                    <button className="w-full h-14 bg-primary text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all">
                                        <Download className="size-4" />
                                        Descargar Factura PDF
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => {
                                            handleUpdateStatus(selectedTransaction.id, selectedTransaction.status);
                                            setSelectedTransaction(null);
                                        }}
                                        className="w-full h-14 bg-amber-500 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 hover:bg-amber-600 active:scale-95 transition-all"
                                    >
                                        <CreditCard className="size-4" />
                                        Pagar Ahora
                                    </button>
                                )}
                                <button 
                                    onClick={() => setSelectedTransaction(null)}
                                    className="w-full h-10 text-slate-400 font-black uppercase tracking-widest text-[9px]"
                                >
                                    Cerrar Detalles
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Billing;
