
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

async function setMainCharacters() {
    console.log('Calculating Main vs Mule...');

    // 1. Fetch all characters
    const { data: characters, error } = await supabase
        .from('characters')
        .select('id, account_id, level, name');

    if (error) {
        console.error('Error fetching characters:', error);
        return;
    }

    // 2. Group by Account
    const accounts = {};
    characters.forEach(char => {
        if (!accounts[char.account_id]) {
            accounts[char.account_id] = [];
        }
        accounts[char.account_id].push(char);
    });

    const updates = [];

    // 3. Determine Main/Mule per Account
    for (const accountId in accounts) {
        const chars = accounts[accountId];

        // Sort by level descending
        chars.sort((a, b) => b.level - a.level);

        // Highest level is Main
        const mainChar = chars[0];
        updates.push({ id: mainChar.id, main: 'Main' });

        // Others are Mule
        for (let i = 1; i < chars.length; i++) {
            updates.push({ id: chars[i].id, main: 'Mule' });
        }
    }

    console.log(`Prepared ${updates.length} updates.`);

    // 4. Execute Updates
    // Since Supabase doesn't have a bulk update for different values easily, we'll do it in parallel promises or chunks.
    // For 300 items, parallel promises is fine, but let's batch to be safe.

    let successCount = 0;
    const CHUNK_SIZE = 50;

    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
        const chunk = updates.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (update) => {
            const { error: updateError } = await supabase
                .from('characters')
                .update({ main: update.main })
                .eq('id', update.id);

            if (!updateError) successCount++;
        }));
        console.log(`Processed ${Math.min(i + CHUNK_SIZE, updates.length)} / ${updates.length}`);
    }

    console.log(`Successfully updated ${successCount} characters.`);
}

setMainCharacters();
