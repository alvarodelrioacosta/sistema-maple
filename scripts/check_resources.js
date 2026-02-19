
import { createClient } from '@supabase/supabase-js';

// Environment variables are loaded via node --env-file=.env

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyResources() {
    console.log('Verifying resource images...');

    const { data: resources, error } = await supabase
        .from('resource_inventory')
        .select('resource_type, image_url')
        .in('resource_type', ['bright_cubes', 'bonus_bright_cubes']);

    if (error) {
        console.error('Error fetching resources:', error);
        return;
    }

    if (!resources || resources.length === 0) {
        console.log('No resources found (likely empty table if not populated yet).');
    } else {
        resources.forEach(r => {
            console.log(`Resource: ${r.resource_type}`);
            console.log(`Image: ${r.image_url}`);
        });
    }
}

verifyResources();
