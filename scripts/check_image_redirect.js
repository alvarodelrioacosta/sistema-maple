
import fs from 'fs';

async function checkRedirect() {
    const itemName = 'Reinforced_Gollux_Earrings';
    const url = `https://maplestory.fandom.com/wiki/Special:FilePath/${itemName}.png`;
    console.log(`Checking redirect for ${url}...`);

    try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        console.log(`Final URL: ${res.url}`);
        console.log(`Status: ${res.status}`);
    } catch (e) {
        console.error('Error:', e);
    }
}

checkRedirect();
