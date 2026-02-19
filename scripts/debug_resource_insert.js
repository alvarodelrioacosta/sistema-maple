
import { createClient } from '@supabase/supabase-js';

// Environment variables are loaded via node --env-file=.env

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function validatetInsert() {
    console.log('Attempting to insert a test resource...');

    // We use a fake account ID for testing, or we could fetch a real one. 
    // Let's try to fetch a real account to avoid FK violation if any.
    const { data: accounts } = await supabase.from('accounts').select('id').limit(1);

    if (!accounts || accounts.length === 0) {
        console.error('No accounts found to test with.');
        return;
    }

    const accountId = accounts[0].id;
    console.log(`Using account ID: ${accountId}`);

    // Try to insert a non-existent resource type to trigger the "insert" path
    // First delete if exists to clean state
    await supabase.from('resource_inventory')
        .delete()
        .eq('account_id', accountId)
        .eq('resource_type', 'guardian_scroll');

    const testResource = {
        account_id: accountId,
        resource_type: 'guardian_scroll',
        quantity: 5,
        last_updated: new Date().toISOString()
    };

    console.log('Inserting...');
    const { data, error } = await supabase
        .from('resource_inventory')
        .insert(testResource)
        .select()
        .single();

    if (error) {
        console.error('INSERT FAILED with error:');
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log('INSERT SUCCESS!');
        console.log(data);
    }
}

validatetInsert();
