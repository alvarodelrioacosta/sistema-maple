import { createClient } from '@supabase/supabase-client';

const supabaseUrl = 'https://egtuwiskijllgipvdydr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVndHV3aXNraWpsbGdpcHZkeWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDM3MTEsImV4cCI6MjA4NTc3OTcxMX0.T8eClq37ZxeeLx4mictRzaYSJw__99YT1Ya9LW1P-A4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('--- DIAGNÓSTICO DE EVENT_DAILY_PROGRESS ---');

    // 1. Ver registros de hoy
    const todayStr = new Date().toISOString().split('T')[0];
    console.log('Fecha hoy (UTC):', todayStr);

    const { data: progress, error } = await supabase
        .from('event_daily_progress')
        .select('*, account:accounts(number)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching progress:', error);
        return;
    }

    console.log('Total registros encontrados:', progress.length);

    const countsByDate = {};
    progress.forEach(p => {
        countsByDate[p.date] = (countsByDate[p.date] || 0) + 1;
    });
    console.log('Conteos por fecha:', countsByDate);

    const todayProgress = progress.filter(p => p.date === todayStr);
    console.log(`Registros para hoy (${todayStr}):`, todayProgress.length);

    if (todayProgress.length > 0) {
        const completed = todayProgress.filter(p => p.completed).length;
        console.log('Completados hoy:', completed);

        const accountsWithProgress = todayProgress.map(p => p.account?.number).sort((a, b) => a - b);
        console.log('Números de cuenta con registros hoy:', accountsWithProgress.join(', '));
    }

    // Buscar duplicados
    const seen = new Set();
    const duplicates = [];
    progress.forEach(p => {
        const key = `${p.event_id}-${p.account_id}-${p.date}`;
        if (seen.has(key)) {
            duplicates.push(key);
        }
        seen.add(key);
    });
    console.log('Claves duplicadas encontradas:', duplicates.length > 0 ? duplicates : 'Ninguna');
}

diagnose();
