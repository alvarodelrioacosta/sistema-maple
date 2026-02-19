
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno desde .env
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
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Faltan credenciales de Supabase en el archivo .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function bulkImport() {
    const filePath = 'bulk_items_to_import.json';

    if (!fs.existsSync(filePath)) {
        console.error(`Error: No se encontró el archivo ${filePath}`);
        console.log('Por favor, crea un archivo llamado bulk_items_to_import.json basado en la plantilla bulk_items_template.json');
        return;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const items = JSON.parse(raw);

    console.log(`🚀 Iniciando importación de ${items.length} items...`);

    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
        // Valores por defecto para campos obligatorios o comunes
        const itemToInsert = {
            name: item.name,
            character_id: item.character_id || null,
            star_force: item.star_force || 0,
            tradeability: item.tradeability || 'Tradeable',
            remaining_trade_slots: item.remaining_trade_slots || 0,
            status: item.status || 'bulk',
            estimated_value: item.estimated_value || 0,
            main_potential_tier: item.main_potential_tier || null,
            main_potential_1: item.main_potential_1 || null,
            main_potential_2: item.main_potential_2 || null,
            main_potential_3: item.main_potential_3 || null,
            bonus_potential_tier: item.bonus_potential_tier || null,
            bonus_potential_1: item.bonus_potential_1 || null,
            bonus_potential_2: item.bonus_potential_2 || null,
            bonus_potential_3: item.bonus_potential_3 || null,
            costo_item: item.costo_item || 0,
            costo_cubos: item.costo_cubos || 0,
            costo_psok: item.costo_psok || 0,
            costo_sf: item.costo_sf || 0,
            costo_perfect_innoc: item.costo_perfect_innoc || 0,
            costo_guardian_scroll: item.costo_guardian_scroll || 0,
            costo_replacement: item.costo_replacement || 0,
            costo_total: item.costo_total || (item.costo_item || 0),
            delivered: false
        };

        const { error } = await supabase.from('items').insert(itemToInsert);

        if (error) {
            console.error(`❌ Error importando "${item.name}":`, error.message);
            errorCount++;
        } else {
            console.log(`✅ Importado: ${item.name}`);
            successCount++;
        }
    }

    console.log('\n--- Resumen de Importación ---');
    console.log(`Éxito: ${successCount}`);
    console.log(`Errores: ${errorCount}`);
    console.log('------------------------------');
}

bulkImport();
