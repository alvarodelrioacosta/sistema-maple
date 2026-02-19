
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

const classMapping = {
    "NL": "Night Lord",
    "DW": "Dawn Warrior",
    "AB": "Angelic Buster",
    "Lumi": "Luminous",
    "DA": "Demon Avenger",
    "Aran": "Aran",
    "Xenon": "Xenon",
    "Bishop": "Bishop",
    "Crossbowman": "Marksman", // Marksman uses crossbows
    "Kaiser": "Kaiser",
    "Kanna": "Kanna",
    "Hero": "Hero",
    "Paladin": "Paladin",
    "Dark Knight": "Dark Knight",
    "Marksman": "Marksman",
    "Bowmaster": "Bowmaster",
    "Pathfinder": "Pathfinder",
    "Shadower": "Shadower",
    "Dual Blade": "Dual Blade",
    "Buccaneer": "Buccaneer",
    "Corsair": "Corsair",
    "Cannoneer": "Cannoneer",
    "Mihile": "Mihile",
    "Blaze Wizard": "Blaze Wizard",
    "Wind Archer": "Wind Archer",
    "Night Walker": "Night Walker",
    "Thunder Breaker": "Thunder Breaker",
    "Evan": "Evan",
    "Mercedes": "Mercedes",
    "Phantom": "Phantom",
    "Shade": "Shade",
    "Battle Mage": "Battle Mage",
    "Blaster": "Blaster",
    "Mechanic": "Mechanic",
    "Wild Hunter": "Wild Hunter",
    "Demon Slayer": "Demon Slayer",
    "Cadena": "Cadena",
    "Kain": "Kain",
    "Hayato": "Hayato",
    "Adele": "Adele",
    "Ark": "Ark",
    "Illium": "Illium",
    "Khali": "Khali",
    "Hoyoung": "Hoyoung",
    "Lara": "Lara",
    "Kinesis": "Kinesis",
    "Zero": "Zero",
    "Lynn": "Lynn",
    "Mo Xuan": "Mo Xuan",
    "Ren": "Ren"
};

async function importData() {
    try {
        // 1. Read JSON file
        const rawData = fs.readFileSync('data_import.json', 'utf-8');
        const jsonData = JSON.parse(rawData);
        console.log(`Read ${jsonData.length} records from JSON.`);

        // 2. Fetch Accounts to Map Number -> ID
        const { data: accounts, error: accError } = await supabase.from('accounts').select('id, number');
        if (accError) throw accError;

        const accountMap = new Map();
        accounts.forEach(acc => accountMap.set(acc.number, acc.id));
        console.log(`Loaded ${accounts.length} accounts.`);

        // 3. Fetch Classes to get Default Job
        const { data: classes, error: classError } = await supabase.from('classes').select('*');
        if (classError) throw classError;

        const classMap = new Map();
        classes.forEach(cls => classMap.set(cls.class_name, cls));
        console.log(`Loaded ${classes.length} classes.`);

        // 4. Process Records
        const charactersToInsert = [];
        const skippedRecords = [];

        for (const record of jsonData) {
            // Validations
            if (!record.Character) continue; // Skip empty names

            // Account Mapping
            // JSON "Account Id" maps to DB "number"
            // Note: JSON "Account Id" might be string or number, force to number usually works but be safe.
            const accNumber = Number(record['Account Id']);
            const accountId = accountMap.get(accNumber);

            if (!accountId) {
                console.warn(`Warning: Account ID ${accNumber} not found for character ${record.Character}. Skipping.`);
                skippedRecords.push({ ...record, reason: 'Account not found' });
                continue;
            }

            // Class Mapping
            let className = record['Class'];
            if (!className) {
                // Skip or insert without class? User implies all should have class.
                // If empty, let's treat as null.
                className = null;
            } else {
                // Remove whitespace
                className = className.trim();
                // Check mapping
                if (classMapping[className]) {
                    className = classMapping[className];
                }
            }

            // Job Determination
            let job = null;
            if (className) {
                const classInfo = classMap.get(className);
                if (classInfo) {
                    // Default to job_1
                    job = classInfo.job_1;
                } else {
                    console.warn(`Warning: Class '${className}' not found in DB for character ${record.Character} (Original: ${record['Class']}).`);
                }
            }

            charactersToInsert.push({
                account_id: accountId,
                name: record.Character,
                level: Number(record.Lv) || 0,
                class: className,
                job: job
            });
        }

        console.log(`Prepared ${charactersToInsert.length} characters for insertion.`);
        if (skippedRecords.length > 0) {
            console.log(`Skipped ${skippedRecords.length} records (see console for details).`);
        }

        // 5. Insert in Chunks (Supabase has limits)
        const CHUNK_SIZE = 100;
        for (let i = 0; i < charactersToInsert.length; i += CHUNK_SIZE) {
            const chunk = charactersToInsert.slice(i, i + CHUNK_SIZE);
            const { error: insertError } = await supabase.from('characters').insert(chunk);

            if (insertError) {
                console.error(`Error inserting chunk ${i / CHUNK_SIZE + 1}:`, insertError);
            } else {
                console.log(`Inserted chunk ${i / CHUNK_SIZE + 1} (${chunk.length} rows).`);
            }
        }

        console.log('Import completed.');

    } catch (error) {
        console.error('Fatal Error:', error);
    }
}

importData();
