import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { Pool } = pg;

// Configuración Producción (Lectura)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

// Configuración Local (Escritura)
// Usamos los valores de .env.local o default local-test docker
const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/telsim_test'
});

const TABLES_TO_SYNC = [
  'api_clients',
  'users',
  'profiles',
  'slots',
  'external_user_mappings',
  'subscriptions',
  'subscriptions_archive',
  'subscription_invoices',
  'payment_methods',
  'sms_logs',
  'automation_logs',
  'brand_keywords',
  'interacciones',
  'contact_leads',
  'device_sessions',
  'line_reactivation_tokens',
  'notifications',
  'notification_history',
  'audit_logs',
  'support_tickets',
  'support_messages',
  'ticket_messages',
  'user_feedback_status',
  'user_ratings',
  'admin_settings'
];

async function ensureColumnsExist(client: any, tableName: string, remoteRow: any) {
  const remoteCols = Object.keys(remoteRow);
  
  // Obtener columnas locales
  const { rows: localColsRes } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [tableName]
  );
  const localCols = new Set(localColsRes.map((r: any) => r.column_name));

  for (const col of remoteCols) {
    if (!localCols.has(col)) {
      console.log(`➕ Añadiendo columna faltante [${col}] a la tabla [${tableName}]...`);
      // Intentamos adivinar tipo o usar TEXT por defecto (seguro en PG)
      let type = 'TEXT';
      if (typeof remoteRow[col] === 'boolean') type = 'BOOLEAN';
      if (typeof remoteRow[col] === 'number') type = 'NUMERIC';
      if (remoteRow[col] && typeof remoteRow[col] === 'object') type = 'JSONB';

      await client.query(`ALTER TABLE public.${tableName} ADD COLUMN ${col} ${type}`);
    }
  }
}

async function syncTable(client: any, tableName: string) {
  console.log(`⏳ Sincronizando tabla: ${tableName}...`);
  
  // 1. Obtener datos de Producción
  let allData: any[] = [];
  let from = 0;
  let to = 999;
  let finished = false;

  while (!finished) {
    // 1. Determinar columna de ordenación (intentamos id o created_at)
    let orderByCol = 'created_at';
    if (['admin_settings', 'profiles', 'brand_keywords', 'device_sessions'].includes(tableName)) {
      orderByCol = 'id';
    }
    if (tableName === 'user_feedback_status') orderByCol = 'updated_at';
    if (tableName === 'slots') orderByCol = 'slot_id';
    if (tableName === 'external_user_mappings') orderByCol = 'api_client_id';

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, to)
      .order(orderByCol, { ascending: true, nullsFirst: true });

    if (error) {
      console.error(`❌ Error leyendo ${tableName} de prod:`, error.message);
      return false;
    }

    if (!data || data.length === 0) {
      finished = true;
    } else {
      allData = [...allData, ...data];
      if (data.length < 1000) finished = true;
      else {
        from += 1000;
        to += 1000;
      }
    }
  }

  if (allData.length === 0) {
    console.log(`ℹ️ La tabla ${tableName} está vacía en producción.`);
    return true;
  }

  console.log(`📡 Recibidos ${allData.length} registros de producción para [${tableName}]. Preparando inserción local...`);

  try {
    await client.query('SAVEPOINT table_sync');
    
    // ASEGURAR COLUMNAS (Dynamic Schema)
    await ensureColumnsExist(client, tableName, allData[0]);

    // De estas columnas, ¿cuáles existen realmente en local?
    const remoteColumns = Object.keys(allData[0]);
    const { rows: localColsRes } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [tableName]
    );
    const localCols = new Set(localColsRes.map((r: any) => r.column_name));
    
    // Solo insertamos las columnas que existen en ambos lados
    const columns = remoteColumns.filter(c => localCols.has(c));
    const colNames = columns.join(', ');
    
    await client.query(`TRUNCATE TABLE public.${tableName} CASCADE`);

    for (const row of allData) {
      const values = columns.map(col => row[col]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `INSERT INTO public.${tableName} (${colNames}) VALUES (${placeholders})`;
      try {
        await client.query(query, values);
      } catch (insertErr: any) {
        console.error(`❌ Error en fila específica de ${tableName}:`, insertErr.message);
        console.log('Fila problemática:', JSON.stringify(row).substring(0, 200) + '...');
        throw insertErr; // Re-lanzar para activar el rollback de la tabla
      }
    }

    await client.query('RELEASE SAVEPOINT table_sync');
    console.log(`✅ Sincronizados ${allData.length} registros en ${tableName}.`);
    return true;
  } catch (err: any) {
    await client.query('ROLLBACK TO SAVEPOINT table_sync');
    console.error(`❌ Fallo total al sincronizar tabla ${tableName}:`, err.message);
    return false;
  }
}

async function runFullSync() {
  console.log('🚀 Iniciando Réplica Local (Producción -> Local)...');
  
  const startTime = Date.now();
  
  const client = await localPool.connect();
  try {
    // Desactivar triggers temporalmente para velocidad y evitar loops
    console.log('🔒 Desactivando triggers locales...');
    await client.query('BEGIN');
    await client.query('SET session_replication_role = "replica"');

    for (const table of TABLES_TO_SYNC) {
      const ok = await syncTable(client, table);
      if (!ok && table === 'users') {
        throw new Error('La sincronización de la tabla crítica [users] falló. Abortando para evitar inconsistencias.');
      }
    }

    await client.query('COMMIT');

    // Reactivar triggers
    await client.query('SET session_replication_role = "origin"');
    console.log('🔓 Triggers reactivados.');

  } catch (err: any) {
    console.error('💥 Error crítico en la sincronización:', err.message);
  } finally {
    client.release();
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ Sincronización finalizada en ${duration}s.`);
  process.exit(0);
}

runFullSync().catch(console.error);
