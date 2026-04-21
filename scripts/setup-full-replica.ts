import { execSync } from 'child_process';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { Client } = pg;

async function setup() {
    console.log('🏗️  Iniciando configuración de Réplica Local...');

    // 1. Levantar Docker
    try {
        console.log('🐳 Levantando contenedor PostgreSQL...');
        execSync('docker compose -f docker-compose.test.yml up -d', { stdio: 'inherit' });
    } catch (err) {
        console.error('❌ Error al levantar Docker. ¿Está instalado y corriendo?');
        process.exit(1);
    }

    // 2. Esperar a que la DB esté lista (reintento simple)
    console.log('⏳ Esperando a que PostgreSQL esté listo...');
    let ready = false;
    let retries = 5;
    const connectionString = 'postgresql://postgres:postgres@127.0.0.1:5432/telsim_test';

    while (!ready && retries > 0) {
        try {
            const client = new Client({ connectionString });
            await client.connect();
            await client.end();
            ready = true;
        } catch (err) {
            retries--;
            if (retries === 0) {
                console.error('❌ No se pudo conectar a la base de datos local.');
                process.exit(1);
            }
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    // 3. Aplicar Esquema (Bootstrap SQL)
    console.log('📜 Aplicando esquema de tablas locales...');
    try {
        const sqlPath = path.resolve(process.cwd(), 'supabase/local_bootstrap_pg_full.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        const client = new Client({ connectionString });
        await client.connect();
        await client.query(sql);
        await client.end();
        console.log('✅ Esquema aplicado correctamente.');
    } catch (err: any) {
        console.error('❌ Error al aplicar el esquema SQL:', err.message);
        process.exit(1);
    }

    // 4. Ejecutar Sincronización
    console.log('🔄 Iniciando descarga de datos desde Producción...');
    try {
        execSync('npx tsx scripts/sync-replica-prod.ts', { stdio: 'inherit' });
    } catch (err) {
        console.error('❌ Falló la sincronización de datos.');
        process.exit(1);
    }

    console.log('\n🌟 ¡Réplica Local de Telsim lista!');
    console.log('Puedes usar "npm run serve:api" para iniciar el servidor usando estos datos.\n');
}

setup().catch(console.error);
