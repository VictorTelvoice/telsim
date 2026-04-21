import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getPool } from '../api/external/_lib/db.js';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runBootstrap() {
    const sqlPath = path.resolve(process.cwd(), 'supabase/local_bootstrap_pg_full.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log(`📖 Leyendo esquema desde: ${sqlPath}`);
    
    const pool = await getPool();
    const client = await pool.connect();
    
    try {
        console.log('🚀 Iniciando bootstrap de base de datos local...');
        await client.query(sql);
        console.log('✅ Bootstrap completado con éxito.');
    } catch (err: any) {
        console.error('❌ Error durante el bootstrap:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runBootstrap();
