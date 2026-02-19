
import fs from 'fs';

async function debug() {
    const url = 'https://maplestory.fandom.com/wiki/Reinforced_Gollux_Earrings';
    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    const html = await res.text();
    fs.writeFileSync('debug_scrape.html', html);
    console.log('Saved debug_scrape.html');
}

debug();
