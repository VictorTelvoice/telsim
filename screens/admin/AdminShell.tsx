import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ChevronLeft } from 'lucide-react';
import AdminSidebar from './AdminSidebar';

const AdminShell: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur flex items-center gap-4 px-4 py-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <LayoutDashboard size={22} className="text-emerald-500" />
          <h1 className="text-lg font-black text-white">Dashboard Admin Integral</h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 sm:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
