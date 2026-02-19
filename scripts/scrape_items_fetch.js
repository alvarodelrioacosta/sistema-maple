
import fs from 'fs';

const itemsToScrape = [
    // Gollux
    { name: 'Reinforced Gollux Earrings', url: 'https://maplestory.fandom.com/wiki/Reinforced_Gollux_Earrings', set: 'Reinforced Gollux Set' },
    { name: 'Reinforced Gollux Ring', url: 'https://maplestory.fandom.com/wiki/Reinforced_Gollux_Ring', set: 'Reinforced Gollux Set' },
    { name: 'Reinforced Engraved Gollux Pendant', url: 'https://maplestory.fandom.com/wiki/Reinforced_Engraved_Gollux_Pendant', set: 'Reinforced Gollux Set' },
    { name: 'Reinforced Engraved Gollux Belt', url: 'https://maplestory.fandom.com/wiki/Reinforced_Engraved_Gollux_Belt', set: 'Reinforced Gollux Set' },

    // Boss Accessory
    { name: 'Horntail Necklace', url: 'https://maplestory.fandom.com/wiki/Horntail_Necklace', set: 'Boss Accessory Set' },
    { name: 'Papulatus Mark', url: 'https://maplestory.fandom.com/wiki/Papulatus_Mark', set: 'Boss Accessory Set' },
    { name: 'Black Bean Mark', url: 'https://maplestory.fandom.com/wiki/Black_Bean_Mark', set: 'Boss Accessory Set' },
];

// Arcane Umbra Construction
const jobs = [
    { name: 'Knight', set: 'Arcane Umbra Set (Warrior)' },
    { name: 'Mage', set: 'Arcane Umbra Set (Magician)' },
    { name: 'Archer', set: 'Arcane Umbra Set (Bowman)' },
    { name: 'Thief', set: 'Arcane Umbra Set (Thief)' },
    { name: 'Pirate', set: 'Arcane Umbra Set (Pirate)' }
];
const parts = ['Hat', 'Shoes', 'Gloves', 'Cape', 'Shoulder'];

jobs.forEach(job => {
    parts.forEach(part => {
        const itemName = `Arcane Umbra ${job.name} ${part}`;
        const urlId = itemName.replace(/ /g, '_');
        itemsToScrape.push({
            name: itemName,
            url: `https://maplestory.fandom.com/wiki/${urlId}`,
            set: job.set
        });
    });
});

async function fetchUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
}

function extractData(html, fallbackName) {
    // 1. Image regex
    const imgMatch = html.match(/class="pi-image-thumbnail"[\s\S]*?src="([^"]+)"/);
    let imageUrl = imgMatch ? imgMatch[1] : null;

    // 2. Level Regex
    // Look for "Level" followed by digits, or inside Requirements table
    const levelMatch = html.match(/Level\s*(\d+)/i);
    let level = levelMatch ? parseInt(levelMatch[1]) : 0;

    // 3. Type Regex
    const typeMatch = html.match(/>Type<\/[\w]+>[\s\S]*?class="pi-data-value[^"]*">([\w\s]+)</);
    let type = typeMatch ? typeMatch[1].trim() : 'Unknown';
    if (!typeMatch) {
        if (fallbackName.includes('Earring')) type = 'Earring';
        else if (fallbackName.includes('Ring')) type = 'Ring';
        else if (fallbackName.includes('Pendant')) type = 'Pendant';
        else if (fallbackName.includes('Belt')) type = 'Belt';
        else if (fallbackName.includes('Hat')) type = 'Hat';
        else if (fallbackName.includes('Shoes')) type = 'Shoes';
        else if (fallbackName.includes('Gloves')) type = 'Gloves';
        else if (fallbackName.includes('Cape')) type = 'Cape';
        else if (fallbackName.includes('Shoulder')) type = 'Shoulder';
        else if (fallbackName.includes('Mark')) type = 'Eye Accessory';
    }

    // Normalizations
    if (type === 'Face Accessory') type = 'Face Acc.';
    if (type === 'Eye Accessory') type = 'Eye Acc.';
    if (type === 'Earrings') type = 'Earring';

    let slots = 0;
    if (fallbackName.includes('Eternal')) slots = 10;

    return {
        image_url: imageUrl,
        item_lv: level,
        type: type,
        slots: slots
    };
}

async function main() {
    const results = [];
    console.log(`Scraping ${itemsToScrape.length} items using fetch...`);

    for (const item of itemsToScrape) {
        try {
            console.log(`Fetching ${item.name}...`);
            const html = await fetchUrl(item.url);
            const data = extractData(html, item.name);
            console.log(`  -> Found Level: ${data.item_lv}, Type: ${data.type}`);

            results.push({
                name: item.name,
                set: item.set,
                ...data
            });
            // await new Promise(r => setTimeout(r, 50)); 
        } catch (e) {
            console.error(`Failed to scrape ${item.name}: ${e.message}`);
        }
    }

    fs.writeFileSync('scraped_items.json', JSON.stringify(results, null, 2));
    console.log('Done! Saved to scraped_items.json');
}

main();
