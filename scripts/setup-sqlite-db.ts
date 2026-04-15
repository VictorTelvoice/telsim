import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'test_db.sqlite');
const db = new Database(dbPath);

console.log('🏗️ Inicializando base de datos SQLite local...');

db.exec(`
    DROP TABLE IF EXISTS external_user_mappings;
    DROP TABLE IF EXISTS slots;
    DROP TABLE IF EXISTS api_clients;
    DROP TABLE IF EXISTS users;

    CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT,
        nombre TEXT,
        role TEXT DEFAULT 'user',
        origin_client_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE api_clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        secret_key_hash TEXT NOT NULL, 
        jwt_secret TEXT, 
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE external_user_mappings (
        api_client_id TEXT REFERENCES api_clients(id),
        external_user_id TEXT NOT NULL,
        telsim_user_id TEXT REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (api_client_id, external_user_id)
    );

    CREATE TABLE slots (
        slot_id TEXT PRIMARY KEY,
        phone_number TEXT NOT NULL UNIQUE,
        plan_type TEXT DEFAULT 'basic',
        status TEXT DEFAULT 'libre',
        region TEXT DEFAULT 'US',
        label TEXT,
        api_client_id TEXT REFERENCES api_clients(id),
        assigned_to TEXT,
        forwarding_active INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Insertar cliente de prueba (GoAuth)
    INSERT INTO api_clients (id, name, secret_key_hash, status)
    VALUES ('edf64997-aa8b-4d9e-9a4d-8e9a8608bcaf', 'goauth', 'hash_test', 'active');

    -- Insertar cliente específico para los tests automatizados
    INSERT INTO api_clients (id, name, secret_key_hash, status)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Test Client', 'hash_test', 'active');

    -- Insertar números de prueba (Inventario)
    INSERT INTO slots (slot_id, phone_number, status, region, label)
    VALUES 
        ('SLOT-001', '+12345440001', 'libre', 'US', 'Test Number 1'),
        ('SLOT-002', '+12345440002', 'libre', 'US', 'Test Number 2'),
        ('SLOT-003', '+12345440003', 'libre', 'CL', 'Test Number Chile');
`);

console.log('✅ Base de datos SQLite creada en:', dbPath);
db.close();
