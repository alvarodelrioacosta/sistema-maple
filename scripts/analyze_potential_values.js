
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function analyze() {
    // Check main_potential values for 71+ and 151+
    const { data: main, error } = await supabase
        .from('main_potential')
        .select('potential_name, val_71, val_151');

    if (error) {
        console.error(error);
        return;
    }

    console.log("Analyzing " + main.length + " records...");

    const uniqueValues = new Set();
    main.forEach(r => {
        if (r.val_71) uniqueValues.add(r.val_71);
        if (r.val_151) uniqueValues.add(r.val_151);
    });

    console.log("Sample Values:");
    console.log(Array.from(uniqueValues).slice(0, 20));

    // Check for edge cases preventing numeric conversion
    const nonNumeric = Array.from(uniqueValues).filter(v => {
        // Strip %, +, spaces
        const clean = v.replace(/[%+\s]/g, '');
        return isNaN(Number(clean));
    });

    console.log("\nNon-convertible values:", nonNumeric);
}

analyze();
