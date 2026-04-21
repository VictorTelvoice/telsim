import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/telsim_test'
});

async function run() {
    console.log('--- ESTRUCTURA BASE LOCAL ---');
    const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    `);
    console.log('Tablas encontradas:', tables.rows.map(r => r.table_name).join(', '));

    for (const table of tables.rows.map(r => r.table_name)) {
        const count = await pool.query(`SELECT count(*) FROM public.${table}`);
        console.log(`Table ${table}: ${count.rows[0].count} rows`);
        if (table === 'users') {
            const cols = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND table_schema = 'public'
            `);
            console.log('Columns for users:', cols.rows.map(r => r.column_name).join(', '));
        }
    }
    pool.end();
}

run().catch(console.error);
