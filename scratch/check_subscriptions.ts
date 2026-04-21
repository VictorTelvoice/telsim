import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/telsim_test' });
async function run() {
    const uid = 'd310eaf8-2c82-4c29-9ea8-6d64616774da';
    const res = await pool.query('SELECT id, slot_id, status, created_at FROM subscriptions WHERE user_id = $1', [uid]);
    console.log(JSON.stringify(res.rows, null, 2));
    pool.end();
}
run().catch(console.error);
