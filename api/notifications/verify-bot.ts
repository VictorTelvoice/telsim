/**
 * TELSIM · POST /api/notifications/verify-bot
 *
 * Verifica que el token y chat_id de Telegram sean válidos (getMe + getChat).
 * Responde { status: 'online' } o { status: 'error' }.
 * Cache in-memory 5 min por token+chat_id para no saturar la API de Telegram.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const cache = new Map<string, { status: 'online' | 'error'; until: number }>();

function cacheKey(token: string, chatId: string): string {
  return `${token}:${chatId}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { telegram_token, telegram_chat_id } = req.body || {};
    const token = typeof telegram_token === 'string' ? telegram_token.trim() : '';
    const chatId = typeof telegram_chat_id === 'string' ? telegram_chat_id.trim() : '';

    if (!token || !chatId) {
      return res.status(200).json({ status: 'error' });
    }

    const key = cacheKey(token, chatId);
    const cached = cache.get(key);
    if (cached && Date.now() < cached.until) {
      return res.status(200).json({ status: cached.status });
    }

    // 1) Validar token con getMe
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();
    if (!meRes.ok || !meData.ok) {
      cache.set(key, { status: 'error', until: Date.now() + CACHE_TTL_MS });
      return res.status(200).json({ status: 'error' });
    }

    // 2) Validar chat con getChat
    const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`);
    const chatData = await chatRes.json();
    if (!chatRes.ok || !chatData.ok) {
      cache.set(key, { status: 'error', until: Date.now() + CACHE_TTL_MS });
      return res.status(200).json({ status: 'error' });
    }

    cache.set(key, { status: 'online', until: Date.now() + CACHE_TTL_MS });
    return res.status(200).json({ status: 'online' });
  } catch (err: any) {
    console.error('[VERIFY-BOT]', err?.message);
    return res.status(200).json({ status: 'error' });
  }
}
