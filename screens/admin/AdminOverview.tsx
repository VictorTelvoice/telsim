import React from 'react';
import AdminCEOMetrics from '../../components/admin/AdminCEOMetrics';
import AdminSalesChart from '../../components/admin/AdminSalesChart';

/**
 * Página de inicio del panel admin: KPIs de CEO + gráfico de ventas.
 * Ruta: /admin/overview
 */
const AdminOverview: React.FC = () => {
  return (
    <div className="p-6">
      <AdminCEOMetrics />
      <div className="max-w-2xl mt-4">
        <AdminSalesChart />
      </div>
    </div>
  );
};

export default AdminOverview;
