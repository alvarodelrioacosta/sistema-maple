
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Manual .env parser
function loadEnv() {
    try {
        const content = fs.readFileSync('.env', 'utf-8');
        const env = {};
        content.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) env[key.trim()] = val.trim();
        });
        return env;
    } catch {
        return process.env;
    }
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function fixData() {
    console.log('Fixing NW -> Night Walker...');

    const { data, error } = await supabase
        .from('characters')
        .update({ class: 'Night Walker', job: 'Thief' })
        .eq('class', 'NW')
        .select();

    if (error) {
        console.error('Error fixing NW:', error);
    } else {
        console.log(`Fixed ${data.length} rows.`);
    }
}

fixData();
