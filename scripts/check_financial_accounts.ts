import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // Use ANON key as Service Key usually not available in env
// But for seeding, we might need permissions.
// If anon key is used, RLS policies must allow insert.

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Checking financial_accounts table...');

    const { data, error } = await supabase
        .from('financial_accounts')
        .select('*');

    if (error) {
        console.error('Error checking table:', error.message);
        if (error.code === '42P01') {
            console.log('Table does not exist. Please run SQL migration.');
        }
        return;
    }

    console.log(`Found ${data.length} accounts.`);

    if (data.length === 0) {
        console.log('Seeding initial accounts...');
        const accounts = [
            { name: 'BCP', currency: 'Soles', type: 'Bank' },
            { name: 'PayPal', currency: 'USD', type: 'Wallet' },
            { name: 'PPFF', currency: 'USD', type: 'Wallet' },
            { name: 'Mercado Pago', currency: 'Pesos Arg', type: 'Wallet' },
            { name: 'Efectivo', currency: 'Pesos Arg', type: 'Cash' },
            { name: 'Efectivo Dolares', currency: 'USD', type: 'Cash' },
            { name: 'Binance', currency: 'USD', type: 'Wallet' },
            { name: 'Inventario / Mesos', currency: 'Mesos (b)', type: 'Game' }
        ];

        const { error: insertError } = await supabase
            .from('financial_accounts')
            .insert(accounts);

        if (insertError) {
            console.error('Error seeding accounts:', insertError.message);
        } else {
            console.log('Accounts seeded successfully.');
        }
    } else {
        console.log('Accounts already exist.');
        // Check if "Inventario / Mesos" exists
        const mesosAccount = data.find(a => a.name === 'Inventario / Mesos');
        if (!mesosAccount) {
            console.log('Adding missing Inventario / Mesos account...');
            await supabase.from('financial_accounts').insert({
                name: 'Inventario / Mesos',
                currency: 'Mesos (b)',
                type: 'Game'
            });
        }
    }
}

main();
