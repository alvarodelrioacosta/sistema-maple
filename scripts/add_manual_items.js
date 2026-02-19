
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

const newItems = [
    {
        name: 'Capa 1',
        type: 'Cape',
        item_lv: 0,
        slots: 0,
        image_url: '/items/capa_1.png',
        set: null
    },
    {
        name: 'Guante 1',
        type: 'Gloves',
        item_lv: 0,
        slots: 0,
        image_url: '/items/guante_1.png',
        set: null
    }
];

async function insertItems() {
    console.log(`Inserting ${newItems.length} manual items...`);

    for (const item of newItems) {
        // Check if exists
        const { data: existing } = await supabase
            .from('items_db')
            .select('id')
            .eq('name', item.name)
            .single();

        if (existing) {
            console.log(`Item ${item.name} already exists. Updating...`);
            const { error } = await supabase
                .from('items_db')
                .update(item)
                .eq('id', existing.id);
            if (error) console.error(`Error updating ${item.name}:`, error);
            else console.log(`Updated ${item.name}`);
        } else {
            const { error } = await supabase
                .from('items_db')
                .insert(item);
            if (error) console.error(`Error inserting ${item.name}:`, error);
            else console.log(`Inserted ${item.name}`);
        }
    }
    console.log('Done.');
}

insertItems();
