const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/telsim_test' });
pool.query("SELECT slot_id, phone_number, assigned_to FROM slots WHERE slot_id = '16A'").then(r => console.log(r.rows)).catch(console.error).finally(()=>pool.end());
