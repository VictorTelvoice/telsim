import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new pg.Pool({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/telsim_test'
});

async function run() {
    const email = 'xrasminx@gmail.com';
    const res = await pool.query("SELECT id, email, nombre FROM users WHERE email = $1", [email]);
    console.log(JSON.stringify(res.rows, null, 2));
    pool.end();
}

run().catch(console.error);
