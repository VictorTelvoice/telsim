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
const getPgPool = async () => {
    const { isLocalTest, useSqlite } = getEnv();
    if (isLocalTest && !useSqlite && !_pgPool) {
        const pg = await import('pg');
        _pgPool = new pg.default.Pool({
            connectionString: 'postgresql://postgres:postgres@localhost:5432/telsim_test'
        });
    }
    return _pgPool;
};

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

        const telsimUserId = randomUUID();
        sqlite.prepare('INSERT INTO users (id, nombre, email, role, origin_client_id) VALUES (?, ?, ?, ?, ?)').run(
            telsimUserId, name || externalId, email, 'external', clientId
        );
        sqlite.prepare('INSERT INTO external_user_mappings (api_client_id, external_user_id, telsim_user_id) VALUES (?, ?, ?)').run(
            clientId, externalId, telsimUserId
        );
        return { data: telsimUserId, error: null };
    }

    if (isLocalTest) {
        const pool = await getPgPool();
        const mapRes = await pool.query('SELECT telsim_user_id FROM external_user_mappings WHERE api_client_id = $1 AND external_user_id = $2', [clientId, externalId]);
        if (mapRes.rows.length > 0) return { data: mapRes.rows[0].telsim_user_id, error: null };

        const telsimUserId = randomUUID();
        await pool.query('INSERT INTO users (id, nombre, email, role, origin_client_id) VALUES ($1, $2, $3, $4, $5)', [telsimUserId, name, email, 'external', clientId]);
        await pool.query('INSERT INTO external_user_mappings (api_client_id, external_user_id, telsim_user_id) VALUES ($1, $2, $3)', [clientId, externalId, telsimUserId]);
        return { data: telsimUserId, error: null };
    }

    const supabase = getSupabase();
    const { data: mapping } = await supabase.from('external_user_mappings').select('telsim_user_id').eq('api_client_id', clientId).eq('external_user_id', externalId).maybeSingle();
    if (mapping) return { data: mapping.telsim_user_id, error: null };

    const newTelsimUserId = randomUUID();
    const { error: userErr } = await supabase.from('users').insert({ id: newTelsimUserId, nombre: name, email: email, role: 'external', origin_client_id: clientId });
    if (userErr) return { data: null, error: userErr };

    await supabase.from('external_user_mappings').insert({ api_client_id: clientId, external_user_id: externalId, telsim_user_id: newTelsimUserId });
    return { data: newTelsimUserId, error: null };
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

  async releaseSlot(slotId: string) {
    const { useSqlite, isLocalTest } = getEnv();
    if (useSqlite) {
        const sqlite = await getSqlite();
        sqlite.prepare(
            "UPDATE slots SET status = 'libre', assigned_to = NULL, api_client_id = NULL, plan_type = NULL, label = NULL, forwarding_active = 0 WHERE slot_id = ?"
        ).run(slotId);
        return { data: { slot_id: slotId }, error: null };
    }
    if (isLocalTest) {
        const pool = await getPgPool();
        const res = await pool.query(
            "UPDATE slots SET status = 'libre', assigned_to = NULL, api_client_id = NULL, plan_type = NULL, label = NULL, forwarding_active = false WHERE slot_id = $1 RETURNING *",
            [slotId]
        );
        return { data: res.rows[0], error: null };
    }
    return getSupabase().from('slots').update({
        status: 'libre',
        assigned_to: null,
        api_client_id: null,
        plan_type: null,
        label: null,
        forwarding_active: false
    }).eq('slot_id', slotId).select().single();
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
  }
};
