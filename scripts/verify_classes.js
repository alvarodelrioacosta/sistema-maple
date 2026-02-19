
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
        .from('classes')
        .select('*', { count: 'exact', head: true });

    const { data: xenon } = await supabase
        .from('classes')
        .select('*')
        .eq('class_name', 'Xenon')
        .single();

    console.log('Total Classes:', count);
    console.log('Xenon:', xenon);
}

check();
