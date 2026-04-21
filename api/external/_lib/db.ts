import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Variables de entorno
const getEnv = () => ({
    isLocalTest: process.env.IS_LOCAL_TEST === 'true',
    useSqlite: process.env.USE_SQLITE === 'true',
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
});

// Clientes Locales (Lazy Init con Importación Dinámica para evitar errores en Vercel)
let _pgPool: any = null;
export const getPgPool = async () => {
    const { isLocalTest, useSqlite } = getEnv();
    if (isLocalTest && !useSqlite && !_pgPool) {
        const pg = await import('pg');
        _pgPool = new pg.default.Pool({
            connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/telsim_test'
        });
    }
    return _pgPool;
};

export const getPool = getPgPool; // Alias para simplificar

let _sqlite: any = null;
const getSqlite = async () => {
    const { isLocalTest, useSqlite } = getEnv();
    if (isLocalTest && useSqlite && !_sqlite) {
        const Database = (await import('better-sqlite3')).default;
        _sqlite = new Database('test_db.sqlite');
    }
    return _sqlite;
};

let _supabase: any = null;
const getSupabase = () => {
    const { supabaseUrl, supabaseKey } = getEnv();
    if (!_supabase) {
        if (!supabaseUrl || !supabaseKey) {
            if (getEnv().isLocalTest) return null;
            throw new Error('Supabase URL and Key are required for this operation.');
        }
        _supabase = createClient(supabaseUrl, supabaseKey);
    }
    return _supabase;
};

export const db = {
  async getClientStatus(clientId: string) {
    const { useSqlite, isLocalTest } = getEnv();
    if (useSqlite) {
        const sqlite = await getSqlite();
        const row = sqlite.prepare('SELECT status FROM api_clients WHERE id = ?').get(clientId) as any;
        return { data: row, error: null };
    }
    if (isLocalTest) {
        const pool = await getPgPool();
        const res = await pool.query('SELECT status FROM api_clients WHERE id = $1 LIMIT 1', [clientId]);
        return { data: res.rows[0], error: null };
    }
    return getSupabase().from('api_clients').select('status').eq('id', clientId).maybeSingle();
  },

  async findOrCreateExternalUser(clientId: string, externalId: string, name?: string, email?: string) {
    const { useSqlite, isLocalTest } = getEnv();

    if (useSqlite) {
        const sqlite = await getSqlite();
        const mapping = sqlite.prepare('SELECT telsim_user_id FROM external_user_mappings WHERE api_client_id = ? AND external_user_id = ?').get(clientId, externalId) as any;
        if (mapping) return { data: mapping.telsim_user_id, error: null };

        let telsimUserId = email ? (sqlite.prepare('SELECT id FROM users WHERE email = ?').get(email) as any)?.id : null;
        
        if (!telsimUserId) {
            telsimUserId = randomUUID();
            sqlite.prepare('INSERT INTO users (id, nombre, email, role, origin_client_id) VALUES (?, ?, ?, ?, ?)').run(
                telsimUserId, name || externalId, email, 'external', clientId
            );
        }

        sqlite.prepare('INSERT INTO external_user_mappings (api_client_id, external_user_id, telsim_user_id) VALUES (?, ?, ?)').run(
            clientId, externalId, telsimUserId
        );
        await this.createAuditLog(telsimUserId, 'SHADOW_USER_CREATED', { clientId, externalId });
        return { data: telsimUserId, error: null };
    }

    if (isLocalTest) {
        const pool = await getPgPool();
        const mapRes = await pool.query('SELECT telsim_user_id FROM external_user_mappings WHERE api_client_id = $1 AND external_user_id = $2', [clientId, externalId]);
        if (mapRes.rows.length > 0) return { data: mapRes.rows[0].telsim_user_id, error: null };

        let telsimUserId = null;
        if (email) {
            const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            if (userRes.rows.length > 0) telsimUserId = userRes.rows[0].id;
        }

        if (!telsimUserId) {
            telsimUserId = randomUUID();
            await pool.query('INSERT INTO users (id, nombre, email, role, origin_client_id) VALUES ($1, $2, $3, $4, $5)', [telsimUserId, name, email, 'external', clientId]);
        }

        await pool.query('INSERT INTO external_user_mappings (api_client_id, external_user_id, telsim_user_id) VALUES ($1, $2, $3)', [clientId, externalId, telsimUserId]);
        await this.createAuditLog(telsimUserId, 'SHADOW_USER_CREATED', { clientId, externalId });
        return { data: telsimUserId, error: null };
    }

    const supabase = getSupabase();
    const { data: mapping } = await supabase.from('external_user_mappings').select('telsim_user_id').eq('api_client_id', clientId).eq('external_user_id', externalId).maybeSingle();
    if (mapping) return { data: mapping.telsim_user_id, error: null };

    let telsimUserId = null;
    if (email) {
        const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
        if (existingUser) telsimUserId = existingUser.id;
    }

    if (!telsimUserId) {
        telsimUserId = randomUUID();
        const { error: userErr } = await supabase.from('users').insert({ id: telsimUserId, nombre: name, email: email, role: 'external', origin_client_id: clientId });
        if (userErr) return { data: null, error: userErr };
    }

    await supabase.from('external_user_mappings').insert({ api_client_id: clientId, external_user_id: externalId, telsim_user_id: telsimUserId });
    await this.createAuditLog(telsimUserId, 'SHADOW_USER_CREATED', { clientId, externalId });
    return { data: telsimUserId, error: null };
  },

  async findFreeSlot() {
    const { useSqlite, isLocalTest } = getEnv();
    if (useSqlite) {
        const sqlite = await getSqlite();
        const row = sqlite.prepare("SELECT slot_id, phone_number FROM slots WHERE status = 'libre' AND assigned_to IS NULL ORDER BY slot_id ASC LIMIT 1").get() as any;
        return { data: row, error: null };
    }
    if (isLocalTest) {
        const pool = await getPgPool();
        const res = await pool.query("SELECT slot_id, phone_number FROM slots WHERE status = 'libre' AND assigned_to IS NULL ORDER BY slot_id ASC LIMIT 1");
        return { data: res.rows[0], error: null };
    }
    return getSupabase().from('slots').select('slot_id, phone_number').eq('status', 'libre').is('assigned_to', null).order('slot_id', { ascending: true }).limit(1).maybeSingle();
  },

  async occupySlot(slotId: string, clientId: string, telsimUserId: string, planType: string, label: string) {
    const { useSqlite, isLocalTest } = getEnv();
    if (useSqlite) {
        const sqlite = await getSqlite();
        sqlite.prepare(
            "UPDATE slots SET status = 'ocupado', api_client_id = ?, assigned_to = ?, plan_type = ?, label = ?, forwarding_active = 0 WHERE slot_id = ?"
        ).run(clientId, telsimUserId, planType, label, slotId);
        const row = sqlite.prepare("SELECT * FROM slots WHERE slot_id = ?").get(slotId) as any;
        return { data: row, error: null };
    }
    if (isLocalTest) {
        const pool = await getPgPool();
        const res = await pool.query(
            "UPDATE slots SET status = 'ocupado', api_client_id = $1, assigned_to = $2, plan_type = $3, label = $4, forwarding_active = false WHERE slot_id = $5 RETURNING *",
            [clientId, telsimUserId, planType, label, slotId]
        );
        return { data: res.rows[0], error: null };
    }
    return getSupabase().from('slots').update({
        status: 'ocupado',
        api_client_id: clientId,
        assigned_to: telsimUserId,
        plan_type: planType,
        label: label,
        forwarding_active: false
    }).eq('slot_id', slotId).select().single();
  },


  async releaseSlot(slotId: string, clientId?: string) {
    const { useSqlite, isLocalTest } = getEnv();
    
    // Obtener info del usuario antes de liberar
    let telsimUserId: string | null = null;
    const findUserQuery = `SELECT assigned_to FROM slots WHERE slot_id = $1`;
    
    if (useSqlite) {
        const sqlite = await getSqlite();
        telsimUserId = (sqlite.prepare(findUserQuery.replace('$1', '?')).get(slotId) as any)?.assigned_to;
    } else if (isLocalTest) {
        const pool = await getPgPool();
        const res = await pool.query(findUserQuery, [slotId]);
        telsimUserId = res.rows[0]?.assigned_to;
    } else {
        const { data } = await getSupabase().from('slots').select('assigned_to').eq('slot_id', slotId).maybeSingle();
        telsimUserId = data?.assigned_to;
    }

    if (useSqlite) {
        const sqlite = await getSqlite();
        sqlite.prepare(
            "UPDATE slots SET status = 'libre', assigned_to = NULL, api_client_id = NULL, plan_type = NULL, label = NULL, forwarding_active = 0 WHERE slot_id = ?"
        ).run(slotId);
    } else if (isLocalTest) {
        const pool = await getPgPool();
        await pool.query(
            "UPDATE slots SET status = 'libre', assigned_to = NULL, api_client_id = NULL, plan_type = NULL, label = NULL, forwarding_active = false WHERE slot_id = $1",
            [slotId]
        );
    } else {
        await getSupabase().from('slots').update({
            status: 'libre',
            assigned_to: null,
            api_client_id: null,
            plan_type: null,
            label: null,
            forwarding_active: false
        }).eq('slot_id', slotId);
    }

    // Si había un cliente asignado, verificar auto-borrado
    if (telsimUserId && clientId) {
        await this.cleanupShadowUserIfEmpty(clientId, telsimUserId);
    }

    return { data: { slot_id: slotId }, error: null };
  },

  async listSlots(clientId: string) {
    const { useSqlite, isLocalTest } = getEnv();
    if (useSqlite) {
        const sqlite = await getSqlite();
        const rows = sqlite.prepare('SELECT * FROM slots WHERE api_client_id = ? ORDER BY created_at DESC').all(clientId) as any[];
        return { data: rows, error: null };
    }
    if (isLocalTest) {
        const pool = await getPgPool();
        const res = await pool.query('SELECT * FROM slots WHERE api_client_id = $1 ORDER BY created_at DESC', [clientId]);
        return { data: res.rows, error: null };
    }
    return getSupabase().from('slots').select('*').eq('api_client_id', clientId).order('created_at', { ascending: false });
  },

  async getSlotDetail(clientId: string, slotId: string) {
    const { useSqlite, isLocalTest } = getEnv();
    if (useSqlite) {
        const sqlite = await getSqlite();
        const row = sqlite.prepare('SELECT * FROM slots WHERE api_client_id = ? AND slot_id = ? LIMIT 1').get(clientId, slotId) as any;
        return { data: row, error: null };
    }
    if (isLocalTest) {
        const pool = await getPgPool();
        const res = await pool.query('SELECT * FROM slots WHERE api_client_id = $1 AND slot_id = $2 LIMIT 1', [clientId, slotId]);
        return { data: res.rows[0], error: null };
    }
    return getSupabase().from('slots').select('*').eq('api_client_id', clientId).eq('slot_id', slotId).maybeSingle();
  },

  async updateUserWebhook(telsimUserId: string, webhookUrl: string, apiSecretKey: string | null) {
    const { useSqlite, isLocalTest } = getEnv();
    const updateObj: any = { 
        user_webhook_url: webhookUrl, 
        webhook_is_active: true 
    };
    if (apiSecretKey) updateObj.api_secret_key = apiSecretKey;

    if (useSqlite) {
        const sqlite = await getSqlite();
        sqlite.prepare(
            "UPDATE users SET user_webhook_url = ?, webhook_is_active = 1, api_secret_key = COALESCE(?, api_secret_key) WHERE id = ?"
        ).run(webhookUrl, apiSecretKey, telsimUserId);
        return { error: null };
    }
    if (isLocalTest) {
        const pool = await getPgPool();
        await pool.query(
            "UPDATE users SET user_webhook_url = $1, webhook_is_active = true, api_secret_key = COALESCE($2, api_secret_key) WHERE id = $3",
            [webhookUrl, apiSecretKey, telsimUserId]
        );
        return { error: null };
    }
    return getSupabase().from('users').update(updateObj).eq('id', telsimUserId);
  },

  async getUserWebhookConfig(telsimUserId: string) {
    const { useSqlite, isLocalTest } = getEnv();
    if (useSqlite) {
        const sqlite = await getSqlite();
        const row = sqlite.prepare('SELECT user_webhook_url, webhook_is_active, api_secret_key FROM users WHERE id = ?').get(telsimUserId) as any;
        return { data: row, error: null };
    }
    if (isLocalTest) {
        const pool = await getPgPool();
        const res = await pool.query('SELECT user_webhook_url, webhook_is_active, api_secret_key FROM users WHERE id = $1', [telsimUserId]);
        return { data: res.rows[0], error: null };
    }
    return getSupabase().from('users').select('user_webhook_url, webhook_is_active, api_secret_key').eq('id', telsimUserId).maybeSingle();
  },

  async getMessagesByExternalUser(clientId: string, externalUserId: string) {
    const { useSqlite, isLocalTest } = getEnv();
    const queryStr = `
        SELECT m.* 
        FROM sms_logs m
        JOIN slots s ON m.slot_id = s.slot_id
        JOIN external_user_mappings e ON s.assigned_to = e.telsim_user_id
        WHERE e.api_client_id = $1 AND e.external_user_id = $2
        ORDER BY m.created_at DESC
    `;

    if (useSqlite) {
        const sqlite = await getSqlite();
        const rows = sqlite.prepare(queryStr.replace(/\$(\d+)/g, '?')).all(clientId, externalUserId) as any[];
        return { data: rows, error: null };
    }
    if (isLocalTest) {
        const pool = await getPgPool();
        const res = await pool.query(queryStr, [clientId, externalUserId]);
        return { data: res.rows, error: null };
    }

    const supabase = getSupabase();
    // En Supabase (PostgREST) las queries complejas se manejan mejor con RPC o vistas si son recursivas, 
    // pero podemos hacer un join manual o usar .select() filtrado.
    const { data: mapping } = await supabase.from('external_user_mappings').select('telsim_user_id').eq('api_client_id', clientId).eq('external_user_id', externalUserId).maybeSingle();
    if (!mapping) return { data: [], error: null };
    
    return supabase.from('sms_logs').select('*, slots!inner(assigned_to)').eq('slots.assigned_to', mapping.telsim_user_id).order('created_at', { ascending: false });
  },

  async cleanupShadowUserIfEmpty(clientId: string, telsimUserId: string) {
    const { useSqlite, isLocalTest } = getEnv();
    
    // 1. Contar slots activos para este usuario
    const checkQuery = `SELECT count(*) as count FROM slots WHERE assigned_to = $1`;
    let count = 0;

    if (useSqlite) {
        const sqlite = await getSqlite();
        count = (sqlite.prepare(checkQuery.replace('$1', '?')).get(telsimUserId) as any).count;
    } else if (isLocalTest) {
        const pool = await getPgPool();
        const res = await pool.query(checkQuery, [telsimUserId]);
        count = parseInt(res.rows[0].count);
    } else {
        const { count: sbCount } = await getSupabase().from('slots').select('*', { count: 'exact', head: true }).eq('assigned_to', telsimUserId);
        count = sbCount || 0;
    }

    if (count === 0) {
        console.log(`🧹 Auto-borrado: Usuario ${telsimUserId} no tiene más números. Eliminando mapeos...`);
        
        await this.createAuditLog(telsimUserId, 'SHADOW_USER_CLEANUP', { reason: 'No numbers assigned' });

        if (useSqlite) {
            const sqlite = await getSqlite();
            sqlite.prepare('DELETE FROM external_user_mappings WHERE telsim_user_id = ?').run(telsimUserId);
            sqlite.prepare('DELETE FROM users WHERE id = ? AND role = "external"').run(telsimUserId);
        } else if (isLocalTest) {
            const pool = await getPgPool();
            await pool.query('DELETE FROM external_user_mappings WHERE telsim_user_id = $1', [telsimUserId]);
            await pool.query('DELETE FROM users WHERE id = $1 AND role = $2', [telsimUserId, 'external']);
        } else {
            const supabase = getSupabase();
            await supabase.from('external_user_mappings').delete().eq('telsim_user_id', telsimUserId);
            await supabase.from('users').delete().eq('id', telsimUserId).eq('role', 'external');
        }
    }
  },

  async createAuditLog(userId: string, action: string, details: any) {
    const { useSqlite, isLocalTest } = getEnv();
    const now = new Date().toISOString();
    
    if (useSqlite) {
        const sqlite = await getSqlite();
        sqlite.prepare('INSERT INTO audit_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)').run(
            userId, action, JSON.stringify(details), now
        );
    } else if (isLocalTest) {
        const pool = await getPgPool();
        await pool.query('INSERT INTO audit_logs (user_id, action, new_data, created_at) VALUES ($1, $2, $3, $4)', 
            [userId, action, JSON.stringify(details), now]);
    } else {
        await getSupabase().from('audit_logs').insert({ user_id: userId, action, new_data: details, created_at: now });
    }
  }
};
