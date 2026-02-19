
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRates() {
    const { data: rates, error } = await supabase
        .from('exchange_rates')
        .select('*');

    if (error) {
        console.error('Error fetching rates:', error);
        return;
    }

    console.log('Exchange Rates:', JSON.stringify(rates, null, 2));

    const usdToMesos = rates?.find(r => r.base_currency === 'USD' && r.target_currency.includes('Mesos'));
    console.log('USD to Mesos candidate:', usdToMesos);
}

checkRates();
