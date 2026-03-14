/**
 * TELSIM · POST /api/manage
 *
 * Redirige al handler consolidado de /api/admin.
 * Misma API: body { action: 'portal' | 'payment-method' | 'notify-ticket-reply' | 'upgrade' | 'cancel' | 'send-test' | 'verify-bot', ...params }
 */
import adminHandler from './admin';
export default adminHandler;
