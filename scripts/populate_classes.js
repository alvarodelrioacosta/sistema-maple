
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

const jobImages = {
    'Bowman': 'https://github.com/misaomaki/misaomaki.github.io/blob/master/assets/job/icon-job-archer.gif',
    'Magician': 'https://github.com/misaomaki/misaomaki.github.io/blob/master/assets/job/icon-job-magician.gif',
    'Pirate': 'https://github.com/misaomaki/misaomaki.github.io/blob/master/assets/job/icon-job-pirate.gif',
    'Thief': 'https://github.com/misaomaki/misaomaki.github.io/blob/master/assets/job/icon-job-thief.gif',
    'Warrior': 'https://github.com/misaomaki/misaomaki.github.io/blob/master/assets/job/icon-job-warrior.gif'
};

// Raw URL helper
function toRaw(url) {
    if (!url) return null;
    return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
}

const classData = {
    "Hero": "Warrior",
    "Paladin": "Warrior",
    "Dark Knight": "Warrior",

    "Arch Mage (Fire/Poison)": "Magician",
    "Arch Mage (Ice/Lightning)": "Magician",
    "Bishop": "Magician",

    "Bowmaster": "Bowman",
    "Marksman": "Bowman",
    "Pathfinder": "Bowman",

    "Night Lord": "Thief",
    "Shadower": "Thief",
    "Dual Blade": "Thief",

    "Buccaneer": "Pirate",
    "Corsair": "Pirate",
    "Cannoneer": "Pirate",

    "Dawn Warrior": "Warrior",
    "Mihile": "Warrior",
    "Blaze Wizard": "Magician",
    "Wind Archer": "Bowman",
    "Night Walker": "Thief",
    "Thunder Breaker": "Pirate",

    "Aran": "Warrior",
    "Evan": "Magician",
    "Mercedes": "Bowman",
    "Phantom": "Thief",
    "Shade": "Pirate",
    "Luminous": "Magician",

    "Battle Mage": "Magician",
    "Blaster": "Warrior",
    "Mechanic": "Pirate",
    "Wild Hunter": "Bowman",
    "Xenon": ["Thief", "Pirate"],
    "Demon Slayer": "Warrior",
    "Demon Avenger": "Warrior",

    "Kaiser": "Warrior",
    "Angelic Buster": "Pirate",
    "Cadena": "Thief",
    "Kain": "Bowman",

    "Hayato": "Warrior",
    "Kanna": "Magician",

    "Adele": "Warrior",
    "Ark": "Pirate",
    "Illium": "Magician",
    "Khali": "Thief",

    "Hoyoung": "Thief",
    "Lara": "Magician",

    "Kinesis": "Magician",
    "Zero": "Warrior",

    "Sia Astelle": "Magician",
    "Lynn": "Magician",
    "Mo Xuan": "Warrior",
    "Ren": "Warrior"
};

async function insertClasses() {
    const entries = [];

    for (const [className, jobInfo] of Object.entries(classData)) {
        let job1, job2;

        if (Array.isArray(jobInfo)) {
            job1 = jobInfo[0];
            job2 = jobInfo[1];
        } else {
            job1 = jobInfo;
            job2 = null;
        }

        entries.push({
            class_name: className,
            job_1: job1,
            image_1: toRaw(jobImages[job1]),
            job_2: job2,
            image_2: toRaw(jobImages[job2]) // Will contain null if job2 is null, which is fine as undefined key lookup returns undefined, toRaw handles null? No wait jobImages[null] is undef.
        });
    }

    // Fix image_2 helper
    entries.forEach(e => {
        if (!e.image_2 && e.job_2) {
            e.image_2 = toRaw(jobImages[e.job_2]);
        }
        // If job_2 is null, image_2 should be null.
        if (!e.job_2) e.image_2 = null;
    });

    console.log(`Inserting ${entries.length} classes...`);

    const { error } = await supabase.from('classes').upsert(entries, { onConflict: 'class_name' });

    if (error) {
        console.error('Error inserting classes:', error);
    } else {
        console.log('Success! Classes populated.');
    }
}

insertClasses();
