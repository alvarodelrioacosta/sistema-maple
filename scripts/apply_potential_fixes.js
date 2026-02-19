
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

function cleanName(name) {
    if (!name) return name;
    let newName = name;
    newName = newName.replace(/ Increase/g, '');
    newName = newName.replace(/Weapon ATT/g, 'Attack Power');
    newName = newName.replace(/Magic ATT/g, 'M. Attack Power');
    return newName;
}

function cleanValue(val) {
    if (!val) return val;
    let v = val.trim();

    // Check for percentage
    if (v.includes('%')) {
        // Remove % and +
        let numStr = v.replace(/[%+]/g, '');
        let num = parseFloat(numStr);
        if (!isNaN(num)) {
            return (num / 100).toString(); // "12%" -> "0.12"
        }
    } else {
        // Remove + but keep -
        if (v.startsWith('+')) {
            return v.substring(1);
        }
    }
    return v;
}

async function processTable(tableName) {
    console.log(`Fetching ${tableName}...`);
    const { data: rows, error } = await supabase
        .from(tableName)
        .select('*');

    if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return;
    }

    console.log(`Processing ${rows.length} rows...`);
    let updates = 0;

    for (const row of rows) {
        let needsUpdate = false;

        const newName = cleanName(row.potential_name);
        const new71 = cleanValue(row.val_71);
        const new151 = cleanValue(row.val_151);

        if (newName !== row.potential_name || new71 !== row.val_71 || new151 !== row.val_151) {
            needsUpdate = true;
        }

        if (needsUpdate) {
            const { error: updateError } = await supabase
                .from(tableName)
                .update({
                    potential_name: newName,
                    val_71: new71,
                    val_151: new151
                })
                .eq('id', row.id);

            if (updateError) console.error(`Failed to update ${row.id}:`, updateError);
            else updates++;
        }
    }
    console.log(`Updated ${updates} rows in ${tableName}.`);
}

async function run() {
    await processTable('main_potential');
    await processTable('bonus_potential');
}

run();
