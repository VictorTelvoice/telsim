import React from 'react';
import AdminCEOMetrics from '../../components/admin/AdminCEOMetrics';
import AdminSalesChart from '../../components/admin/AdminSalesChart';

/**
 * Pantalla principal del panel admin: KPIs (MRR, Usuarios, Ocupación) y gráficos de ventas.
 * Ruta: /admin/overview
 */
const AdminOverview: React.FC = () => {
  return (
    <div className="min-h-full bg-slate-50 p-6">
      <AdminCEOMetrics />
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-2xl">
        <AdminSalesChart />
      </div>
    </div>
  );
};

export default AdminOverview;
