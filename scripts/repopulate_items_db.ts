
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables for the script
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client directly since we are in a standalone script
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const jsonPath = path.join(__dirname, '../filtered_items.json');

async function repopulateItemsDB() {
    try {
        console.log('Reading filtered_items.json...');
        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const items = JSON.parse(rawData);

        console.log(`Found ${items.length} items to insert.`);

        // 1. Delete all existing items
        console.log('Deleting existing items from items_db...');
        const { error: deleteError } = await supabase
            .from('items_db')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a valid condition usually required by Supabase safely, or just filter everything)
        // actually strict RLS or delete policies might block delete without filter. 
        // .neq('id', 'uuid-that-doesnt-exist') is safer if we want to delete all, but usually .delete().gt('id', '0000') etc works.
        // Let's try to delete everything. empty filter sometimes fails in client depending on settings.
        // A common trick is .neq('id', '0') if ids are uuid.

        // Note: DELETE without WHERE is often blocked. providing a condition that matches all rows.
        // Assuming ID is UUID.
        const { error: deleteError2 } = await supabase
            .from('items_db')
            .delete()
            .not('id', 'is', null);

        if (deleteError2) {
            console.error('Error deleting items:', deleteError2);
            // proceed? Maybe we shouldn't if delete failed.
            // return;
        } else {
            console.log('Existing items deleted.');
        }

        // 2. Prepare data for insertion
        const itemsToInsert = items.map((item: any) => {
            // Map Type
            let type = item.Type;
            if (type === 'Face') type = 'Face Acc.';
            if (type === 'Eye') type = 'Eye Acc.';

            // Calculate Slots
            // "Si en el nombre esta la palabra Eternal, colocar el campo de slots en 10, sino 0."
            const name = item.Name || '';
            const slots = name.includes('Eternal') ? 10 : 0;

            return {
                name: item.Name,
                type: type,
                item_lv: item.Level, // JSON has 'Level' (number) now
                image_url: item.ImageUrl,
                set: item.Set,
                slots: slots
            };
        });

        // 3. Insert new items
        console.log('Inserting new items...');
        const { data, error: insertError } = await supabase
            .from('items_db')
            .insert(itemsToInsert)
            .select();

        if (insertError) {
            console.error('Error inserting items:', insertError);
        } else {
            console.log(`Successfully inserted ${data?.length} items.`);
        }

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

repopulateItemsDB();
