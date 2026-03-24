import React from 'react';
import UserBillingPanel from '../../components/billing/UserBillingPanel';

/** Ruta móvil / dedicada: mismo contenido que la pestaña Facturación del WebDashboard. */
const Billing: React.FC = () => <UserBillingPanel variant="page" />;

export default Billing;
