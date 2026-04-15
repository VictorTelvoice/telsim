import { execSync } from 'child_process';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

async function run() {
  console.log('🚀 Iniciando entorno de pruebas local (SQLite)...');

  try {
    // 1. Inicializar SQLite
    console.log('📦 Configurando base de datos SQLite...');
    execSync('npx tsx scripts/setup-sqlite-db.ts', { stdio: 'inherit' });

    // 2. Ejecutar los tests de la API
    console.log('🧪 Ejecutando pruebas de API externa...');
    
    execSync('npx tsx scripts/test-external-api.ts', { 
        stdio: 'inherit',
        env: {
            ...process.env,
            SUPABASE_URL: 'https://localhost.test.local', 
            SUPABASE_SERVICE_ROLE_KEY: 'dummy-key',
            EXTERNAL_API_SECRET: 'secret',
            IS_LOCAL_TEST: 'true',
            USE_SQLITE: 'true'
        }
    });

  } catch (error: any) {
    console.error('❌ Error en el flujo de pruebas:', error.message);
  } finally {
    console.log('\n💡 Pruebas finalizadas sobre SQLite.');
  }
}

run();
