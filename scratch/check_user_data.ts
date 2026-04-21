import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/telsim_test' });
async function run() {
    const uid = 'd310eaf8-2c82-4c29-9ea8-6d64616774da';
    const slots = await pool.query('SELECT count(*) FROM slots WHERE assigned_to = $1', [uid]);
    const logs = await pool.query('SELECT count(*) FROM sms_logs WHERE user_id = $1', [uid]);
    const subs = await pool.query('SELECT count(*) FROM subscriptions WHERE user_id = $1', [uid]);
    console.log(JSON.stringify({ 
        user_id: uid, 
        slots: parseInt(slots.rows[0].count), 
        sms_logs: parseInt(logs.rows[0].count), 
        subscriptions: parseInt(subs.rows[0].count) 
    }, null, 2));
    pool.end();
}
run().catch(console.error);
