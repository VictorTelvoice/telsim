
import { getPool } from '../api/external/_lib/db.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function check() {
    try {
        const pool = await getPool();
        const { rows } = await pool.query('SELECT id, email, nombre FROM users');
        console.log('Users in DB:', rows);
        
        const devEmail = process.env.DEV_AUTH_USER_EMAIL || 'xrasminx@gmail.com';
        console.log('Target Dev Email:', devEmail);
        
        const { rows: devUser } = await pool.query('SELECT id, email FROM users WHERE email = $1', [devEmail]);
        console.log('Dev User found:', devUser);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}

check();
