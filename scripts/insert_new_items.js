
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
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertItems() {
    const raw = fs.readFileSync('final_items.json', 'utf-8');
    const items = JSON.parse(raw);

    console.log(`Preparing to insert ${items.length} items...`);

    let inserted = 0;
    let skipped = 0;

    for (const item of items) {
        // Check existence
        const { data: existing } = await supabase
            .from('items_db')
            .select('id')
            .eq('name', item.name)
            .single();

        if (existing) {
            console.log(`Skipping ${item.name} (already exists)`);
            skipped++;
            continue;
        }

        const { error } = await supabase.from('items_db').insert({
            name: item.name,
            type: item.type,
            item_lv: item.item_lv,
            slots: item.slots,
            image_url: item.image_url,
            set: item.set
        });

        if (error) {
            console.error(`Error inserting ${item.name}:`, error.message);
        } else {
            console.log(`Inserted ${item.name}`);
            inserted++;
        }
    }

    console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}`);
}

insertItems();
