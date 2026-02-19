
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// Environment variables are loaded via node --env-file=.env

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const IMAGES = {
    bright_cubes: 'https://raw.githubusercontent.com/misaomaki/misaomaki.github.io/master/assets/cube/BrightCube.png',
    bonus_bright_cubes: 'https://raw.githubusercontent.com/misaomaki/misaomaki.github.io/master/assets/cube/BonusBrightCube.png',
    psok: 'https://media.maplestorywiki.net/yetidb/Use_Silver_Scissors_of_Karma.png'
};

async function updateResources() {
    console.log('Updating resource images...');

    const updates = [
        { type: 'bright_cubes', url: IMAGES.bright_cubes },
        { type: 'bonus_bright_cubes', url: IMAGES.bonus_bright_cubes },
        { type: 'psok', url: IMAGES.psok }
    ];

    for (const item of updates) {
        const { error } = await supabase
            .from('resource_inventory')
            .update({ image_url: item.url })
            .eq('resource_type', item.type);

        if (error) console.error(`Error updating ${item.type}:`, error);
        else console.log(`Updated ${item.type} image.`);
    }
}

updateResources();
