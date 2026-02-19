
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: .env variables missing');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function insertBatch(table, data, batchSize = 500) {
    console.log(`Inserting into ${table}: ${data.length} records...`);

    // Map JSON fields to DB columns if names match strictly, otherwise map explicitly
    // JSON keys: item_type, rank, potential_name, val_0_30, val_31_70, val_71, val_151, val_120
    // DB columns: Same names.

    for (let i = 0; i < data.length; i += batchSize) {
        const chunk = data.slice(i, i + batchSize);

        // Ensure no extra fields cause errors
        const cleanedChunk = chunk.map(item => ({
            item_type: item.item_type,
            rank: item.rank,
            potential_name: item.potential_name,
            val_0_30: item.val_0_30,
            val_31_70: item.val_31_70,
            val_71: item.val_71,
            val_151: item.val_151,
            val_120: item.val_120
        }));

        const { error } = await supabase.from(table).insert(cleanedChunk);

        if (error) {
            console.error(`Error inserting batch ${i}:`, error);
        } else {
            console.log(`  Inserted batch ${i} - ${i + chunk.length}`);
        }
    }
}

async function run() {
    try {
        const rawData = await fs.readFile('potentials_formatted.json', 'utf-8');
        const jsonData = JSON.parse(rawData);

        // Clear existing data? 
        // User said they deleted content, but maybe we should ensure it's clean if we run this?
        // Let's assume user handled the truncate or we just append.

        if (jsonData.main_potential && jsonData.main_potential.length > 0) {
            await insertBatch('main_potential', jsonData.main_potential);
        }

        if (jsonData.bonus_potential && jsonData.bonus_potential.length > 0) {
            await insertBatch('bonus_potential', jsonData.bonus_potential);
        }

        console.log('All insertions complete!');

    } catch (err) {
        console.error('Execution failed:', err);
    }
}

run();
