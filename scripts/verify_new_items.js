
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
    try {
        return fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
            const [k, v] = line.split('='); if (k && v) acc[k.trim()] = v.trim(); return acc;
        }, {});
    } catch { return process.env; }
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { count, error } = await supabase
        .from('items_db')
        .select('*', { count: 'exact', head: true })
        .not('set', 'is', null);

    console.log('Items with Set info:', count);
}

check();
