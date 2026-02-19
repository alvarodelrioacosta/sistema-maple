
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

const jobs = [
    { name: 'Knight', set: 'Eternal Set (Warrior)' },
    { name: 'Archer', set: 'Eternal Set (Bowman)' },
    { name: 'Thief', set: 'Eternal Set (Thief)' },
    { name: 'Pirate', set: 'Eternal Set (Pirate)' },
    { name: 'Mage', set: 'Eternal Set (Magician)' },
];

// Convert blob URL to raw URL to ensure it works in <img src>
function toRawUrl(url) {
    return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
}

const parts = [
    { type: 'Shoes', img: 'https://github.com/misaomaki/misaomaki.github.io/blob/master/assets/maple_items/EternalShoes.png' },
    { type: 'Cape', img: 'https://github.com/misaomaki/misaomaki.github.io/blob/master/assets/maple_items/EternalCape.png' },
    { type: 'Gloves', img: 'https://github.com/misaomaki/misaomaki.github.io/blob/master/assets/maple_items/EternalGloves.png' }
];

const brilliantItems = [
    {
        name: 'WhisperOfTheSource',
        url: 'https://github.com/misaomaki/misaomaki.github.io/blob/master/assets/maple_items/WhisperOfTheSource.png',
        type: 'Face Acc.'
    },
    {
        name: 'OathofDeath',
        url: 'https://github.com/misaomaki/misaomaki.github.io/blob/master/assets/maple_items/OathofDeath.png',
        type: 'Badge' // Best guess, or leave null if unsure. User said "rest of fields empty" but type is useful
    }
];

async function main() {
    const itemsToInsert = [];

    // Generate Eternals (15 items)
    jobs.forEach(job => {
        parts.forEach(part => {
            itemsToInsert.push({
                name: `Eternal ${job.name} ${part.type}`,
                type: part.type,
                item_lv: 250,
                slots: 10,
                image_url: toRawUrl(part.img),
                set: job.set
            });
        });
    });

    // Generate Brilliant Boss (2 items)
    brilliantItems.forEach(item => {
        itemsToInsert.push({
            name: item.name,
            type: null, // User said leave empty, but I'll default to null to be safe if type isn't certain. 
            // Actually, for "OathofDeath" created usually implies Badge or similar. 
            // Let's stick to user request "The rest of fields can be empty". 
            // But Level and Slots are defined: Lv 250, Slots 5.
            item_lv: 250,
            slots: 5,
            image_url: toRawUrl(item.url),
            set: 'Brilliant Boss Set'
        });
    });

    console.log(`Inserting ${itemsToInsert.length} items...`);

    for (const item of itemsToInsert) {
        // Check existing
        const { data: existing } = await supabase.from('items_db').select('id').eq('name', item.name).single();

        if (existing) {
            console.log(`Updating ${item.name}...`);
            const { error } = await supabase.from('items_db').update(item).eq('id', existing.id);
            if (error) console.error(error);
        } else {
            console.log(`Inserting ${item.name}...`);
            const { error } = await supabase.from('items_db').insert(item);
            if (error) console.error(error);
        }
    }

    console.log('Done.');
}

main();
