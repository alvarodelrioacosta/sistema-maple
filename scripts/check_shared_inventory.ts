import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking shared_inventory table...');
    const { data: shared, error: sharedError } = await supabase.from('shared_inventory').select('*');
    if (sharedError) {
        console.error('Error fetching shared_inventory:', sharedError);
    } else {
        console.log('Shared Inventory Data:', shared);
    }

    console.log('Checking accounts table for mesos_b column...');
    const { data: accounts, error: accountError } = await supabase.from('accounts').select('id, email, mesos_b').limit(1);
    if (accountError) {
        console.error('Error fetching accounts:', accountError);
    } else {
        console.log('Accounts Data Sample:', accounts);
    }
}

check();
