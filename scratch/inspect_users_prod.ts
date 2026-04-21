import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function inspect(tableName: string) {
    console.log(`\nInspecting ${tableName}...`);
    const { data, error, count } = await supabase.from(tableName).select('*', { count: 'exact' });
    if (error) {
        console.error(`Error:`, error.message);
    } else {
        console.log(`Table ${tableName} has ${data.length} rows (count: ${count}).`);
        if (data.length > 0) {
            console.log(`Columns:`, Object.keys(data[0]));
        }
    }
}

async function run() {
    await inspect('users');
    process.exit(0);
}

run();
