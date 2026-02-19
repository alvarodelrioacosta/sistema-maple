
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

async function verify() {
    console.log('Verifying data...');

    // Check total count
    const { count, error: countError } = await supabase
        .from('items_db')
        .select('*', { count: 'exact', head: true });

    if (countError) console.error('Count error:', countError);
    console.log(`Total items in DB: ${count}`);

    // Check Eternal item slots
    const { data: eternalItem, error: eternalError } = await supabase
        .from('items_db')
        .select('name, slots')
        .ilike('name', '%Eternal%')
        .limit(1)
        .single();

    if (eternalError) console.error('Eternal verify error:', eternalError);
    if (eternalItem) {
        console.log(`Eternal Item: ${eternalItem.name}, Slots: ${eternalItem.slots} (Expected: 10)`);
        if (eternalItem.slots !== 10) console.error('FAIL: Eternal slots mismatch');
    }

    // Check Non-Eternal item slots
    const { data: normalItem, error: normalError } = await supabase
        .from('items_db')
        .select('name, slots')
        .not('name', 'ilike', '%Eternal%')
        .limit(1)
        .single();

    if (normalError) console.error('Normal verify error:', normalError);
    if (normalItem) {
        console.log(`Normal Item: ${normalItem.name}, Slots: ${normalItem.slots} (Expected: 0)`);
        if (normalItem.slots !== 0) console.error('FAIL: Normal slots mismatch');
    }

    // Check Set field availability
    const { data: setItem, error: setError } = await supabase
        .from('items_db')
        .select('name, set')
        .not('set', 'is', null)
        .limit(1)
        .single();

    if (setItem) {
        console.log(`Item with set: ${setItem.name}, Set: ${setItem.set}`);
    }
}

verify();
