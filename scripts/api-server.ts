import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import http from 'http';
import crypto from 'crypto';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import numbersHandler from '../api/external/numbers.js';
import userHandler from '../api/external/user.js';
import { getPool } from '../api/external/_lib/db.js';

const app = express();
const server = http.createServer(app);
const PORT = 3001;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-key-for-local-dev';

app.use(cors());
app.use(express.json());

// Emulación de Vercel Request/Response en Express
// Definido antes de los handlers para evitar ReferenceErrors
const vLink = (handler: any) => async (req: express.Request, res: express.Response) => {
    try {
        await handler(req, res);
    } catch (err: any) {
        console.error('❌ API Handler Error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error', details: err.message });
        }
    }
};

// --- MOCK REALTIME (v3.2) ---
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', (ws) => {
    console.log('🔌 [Realtime] Nueva conexión WebSocket detectada.');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.event === 'phx_join' || data.event === 'heartbeat') {
                ws.send(JSON.stringify({ 
                    topic: data.topic, 
                    event: 'phx_reply', 
                    payload: { status: 'ok', response: {} }, 
                    ref: data.ref 
                }));
                
                if (data.topic === 'realtime:public:sms_logs') {
                    console.log('📡 [Realtime] Suscripción ' + data.topic);
                    ws.send(JSON.stringify({
                        topic: data.topic,
                        event: 'postgres_changes',
                        payload: { data: {}, event: 'initial_sync' },
                        ref: null
                    }));
                }
            }
        } catch (e) {}
    });
});
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket as any, head, (ws) => wss.emit('connection', ws, request));
});

// --- AUTH HANDLERS (Simulación PKCE / Auth v2) ---
const getDevUser = async () => {
    try {
        const pool = await getPool();
        const email = process.env.DEV_AUTH_USER_EMAIL || 'xrasminx@gmail.com';
        console.log(`🔍 [Auth] Buscando usuario dev: ${email}`);
        
        let { rows: [user] } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (!user) {
            console.warn(`⚠️ [Auth] Usuario ${email} no encontrado, usando el primero disponible.`);
            ({ rows: [user] } = await pool.query('SELECT * FROM users LIMIT 1'));
        }
        
        if (!user) {
            console.error('❌ [Auth] ¡No hay usuarios en la tabla public.users!');
        } else {
            console.log(`✅ [Auth] Usuario encontrado: ${user.email} (${user.id})`);
        }
        return user;
    } catch (e: any) {
        console.error('❌ [Auth Error] DB Error:', e.message);
        return null;
    }
};

app.get('/auth/v1/authorize', (req, res) => {
    const redirectTo = (req.query.redirect_to as string) || 'http://localhost:3000/auth/callback';
    const state = req.query.state as string;
    const code = 'mock-pkce-code-' + Date.now();
    
    // Construir URL de retorno con el código esperado por PKCE
    let finalUrl = new URL(redirectTo);
    finalUrl.searchParams.set('code', code);
    if (state) finalUrl.searchParams.set('state', state);

    console.log(`🔗 [Auth] Authorize -> Redirect to: ${finalUrl.toString()}`);
    res.redirect(finalUrl.toString());
});

app.post('/auth/v1/token', async (req, res) => {
    const grant_type = req.query.grant_type || req.body.grant_type;
    const code = req.query.code || req.body.code;
    const refresh_token = req.query.refresh_token || req.body.refresh_token;

    console.log(`🔑 [Auth] Token Request: grant_type=${grant_type} code=${code}`);

    const user = await getDevUser();
    if (!user) return res.status(401).json({ error: 'invalid_grant', error_description: 'Usuario de desarrollo no encontrado en DB' });

    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign({ 
        aud: 'authenticated', 
        exp: now + 3600, 
        sub: user.id, 
        email: user.email, 
        role: 'authenticated',
        app_metadata: { provider: 'google', providers: ['google'] },
        user_metadata: { full_name: user.nombre, avatar_url: user.avatar_url }
    }, JWT_SECRET);
    
    console.log(`✅ [Auth] Token emitido para: ${user.email}`);
    res.json({
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: 'mock-refresh-token',
        user: { 
            id: user.id, 
            email: user.email, 
            aud: 'authenticated', 
            role: 'authenticated', 
            user_metadata: { full_name: user.nombre, avatar_url: user.avatar_url },
            app_metadata: { provider: 'google', providers: ['google'] },
            created_at: user.created_at,
            last_sign_in_at: new Date().toISOString()
        }
    });
});

app.get('/auth/v1/user', async (req, res) => {
    const authHeader = req.headers.authorization;
    console.log(`👤 [Auth] User check: ${authHeader ? 'Token presente' : 'Token ausente'}`);
    
    const user = await getDevUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    res.json({ 
        id: user.id, 
        email: user.email, 
        aud: 'authenticated', 
        role: 'authenticated',
        user_metadata: { full_name: user.nombre, avatar_url: user.avatar_url },
        app_metadata: { provider: 'google', providers: ['google'] }
    });
});

app.all('/auth/v1/logout', (req, res) => {
    console.log('🚪 [Auth] Logout');
    res.status(200).json({});
});

// --- WEBHOOK FORWARDER LOGIC ---

async function forwardSmsWebhook(sms: any) {
    try {
        const pool = await getPool();
        // 1. Encontrar al usuario dueño del slot y su config de webhook
        const query = `
            SELECT u.user_webhook_url, u.api_secret_key, u.webhook_is_active, s.phone_number
            FROM public.users u
            JOIN public.slots s ON s.assigned_to = u.id
            WHERE s.slot_id = $1 AND u.webhook_is_active = true
        `;
        const { rows } = await pool.query(query, [sms.slot_id]);
        
        if (rows.length === 0 || !rows[0].user_webhook_url) {
            console.log(`ℹ️ [Webhook] No hay webhook activo para el slot ${sms.slot_id}`);
            return;
        }

        const config = rows[0];
        const payload = {
            id: sms.id,
            slot_id: sms.slot_id,
            phone_number: config.phone_number,
            sender: sms.sender,
            content: sms.content,
            verification_code: sms.verification_code,
            created_at: sms.created_at
        };

        const body = JSON.stringify(payload);
        const signature = crypto
            .createHmac('sha256', config.api_secret_key || 'fallback_secret')
            .update(body)
            .digest('hex');

        console.log(`🚀 [Webhook] Enviando SMS a ${config.user_webhook_url}...`);

        const response = await fetch(config.user_webhook_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telsim-Signature': signature
            },
            body: body
        });

        if (response.ok) {
            console.log(`✅ [Webhook] Entregado con éxito a GoAuth.`);
        } else {
            const errorText = await response.text();
            console.error(`❌ [Webhook] Error de entrega: ${response.status} ${errorText.substring(0, 50)}`);
        }
    } catch (err: any) {
        console.error(`💥 [Webhook Error]`, err.message);
    }
}

// --- REST HANDLERS (v3.2 Robust) ---

app.get('/rest/v1/:table', async (req, res) => {
    const { table } = req.params;
    const singular = req.headers.accept?.includes('application/vnd.pgrst.object+json');
    console.log(`🔍 [REST] GET /${table} ${singular ? '[Single]' : ''}`);
    
    try {
        const pool = await getPool();
        let query = `SELECT * FROM public.${table}`;
        const params: any[] = [];
        const filters = Object.keys(req.query).filter(k => !['select', 'limit', 'order'].includes(k));
        
        if (filters.length > 0) {
            query += ' WHERE ' + filters.map((f, i) => {
                const val = req.query[f] as string;
                if (val.startsWith('in.')) {
                    params.push(val.replace('in.(', '').replace(')', '').split(','));
                    return `${f} = ANY($${i + 1})`;
                }
                params.push(val.replace(/^eq\./, '').replace(/'/g, '').toLowerCase());
                return `LOWER(${f}::text) = $${i + 1}`;
            }).join(' AND ');
        }
        if (req.query.order) { 
            const [col, dir] = (req.query.order as string).split('.'); 
            query += ` ORDER BY ${col} ${dir === 'desc' ? 'DESC' : 'ASC'}`; 
        }
        if (req.query.limit) query += ` LIMIT ${req.query.limit}`;

        const { rows } = await pool.query(query, params);
        console.log(`✅ [REST] /${table}: ${rows.length} registros.`);

        if (table === 'slots' && rows.length > 0) {
            const { rows: subs } = await pool.query('SELECT * FROM subscriptions WHERE slot_id = ANY($1)', [rows.map(r => r.slot_id)]);
            rows.forEach(r => r.activeSub = subs.find(s => s.slot_id === r.slot_id) || null);
        }

        res.json(singular ? (rows[0] || null) : rows);
    } catch (err: any) {
        console.error(`❌ [REST Error] GET /${table}:`, err.message);
        res.status(200).json(singular ? null : []); 
    }
});

app.post('/rest/v1/:table', async (req, res) => {
    const { table } = req.params;
    const onConflict = req.query.on_conflict as string;
    console.log(`📥 [REST] POST /${table}${onConflict ? ` (Upsert: ${onConflict})` : ''}`);
    
    try {
        const pool = await getPool();
        const data = Array.isArray(req.body) ? req.body[0] : req.body;
        if (!data) return res.status(201).json([]);

        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        
        let query = `INSERT INTO public.${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        if (onConflict && keys.includes(onConflict)) {
            const updateSet = keys.filter(c => c !== onConflict).map(c => `${c} = EXCLUDED.${c}`).join(', ');
            query += ` ON CONFLICT (${onConflict}) DO UPDATE SET ${updateSet}`;
        }
        query += ' RETURNING *';
        
        const { rows } = await pool.query(query, values);
        console.log(`✅ [REST] POST /${table}: Éxito.`);
        
        // --- ACTIVAR WEBHOOK SI ES SMS_LOGS ---
        if (table === 'sms_logs' && rows.length > 0) {
            forwardSmsWebhook(rows[0]).catch(console.error);
        }

        res.status(201).json(rows);
    } catch (err: any) {
        console.warn(`⚠️ [REST Warn] POST /${table} fallback:`, err.message);
        res.status(201).json(Array.isArray(req.body) ? req.body : [req.body]);
    }
});

app.all('/rest/v1/rpc/:method', (req, res) => {
    console.log(`⚡ [RPC] /${req.params.method}`);
    res.json({});
});

app.post('/api/manage', async (req, res) => {
    const { action } = req.body;
    console.log(`🛠️ [Manage] Acción: ${action}`);
    
    try {
        const pool = await getPool();
        if (action === 'get-owned-slots') {
            const { rows } = await pool.query('SELECT * FROM slots WHERE slot_id = ANY($1)', [req.body.slotIds]);
            return res.json({ slots: rows });
        }
        if (action === 'list-automation-logs') {
            const { rows } = await pool.query('SELECT * FROM automation_logs ORDER BY created_at DESC LIMIT $1', [req.body.limit || 50]);
            return res.json({ logs: rows });
        }
        res.json({ status: 'ok', action });
    } catch (e: any) {
        console.error(`❌ [Manage Error] ${action}:`, e.message);
        res.status(200).json({ status: 'ok', logs: [], slots: [] });
    }
});

app.all('/api/external/user', vLink(userHandler));
app.all('/api/external/numbers', vLink(numbersHandler));

// Health check para el dashboard
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '3.2' }));

server.listen(PORT, () => {
    console.log(`\n***************************************************`);
    console.log(`🚀 TELSIM LOCAL SERVER v3.2 (AUTO-AUTH ENABLED)`);
    console.log(`📡 Modo PKCE & Database Parity Activos`);
    console.log(`🔗 Proxy: http://localhost:3001`);
    console.log(`***************************************************\n`);
});
