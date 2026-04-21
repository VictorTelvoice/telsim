import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function inspect(tableName: string) {
    console.log(`\nInspecting ${tableName}...`);
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
        console.error(`Error:`, error.message);
    } else if (data && data.length > 0) {
        console.log(`Columns for ${tableName}:`, Object.keys(data[0]));
        console.log(`Sample row:`, data[0]);
    } else {
        console.log(`Table ${tableName} is empty or no data returned.`);
    }
}

async function run() {
    await inspect('brand_keywords');
    await inspect('user_feedback_status');
    await inspect('audit_logs');
    process.exit(0);
}

run();
