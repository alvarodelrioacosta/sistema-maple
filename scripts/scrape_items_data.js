
import fs from 'fs';
import https from 'https';

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
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

function extractData(html, fallbackName) {
    // 1. Image
    // Look for <img ... class="pi-image-thumbnail" ... src="...">
    const imgMatch = html.match(/class="pi-image-thumbnail"[\s\S]*?src="([^"]+)"/);
    let imageUrl = imgMatch ? imgMatch[1] : null;
    if (imageUrl) {
        // Remove scale query params to get original or clean version if possible, but usually just using what's there is fine.
        // Fandom urls often look like: .../image.png/revision/latest/scale-to-width-down/200?cb=...
        // We probably want up to "latest" or just the full string. Let's keep full string for safety.
    }

    // 2. Level
    // Typically: <th>Requirements</th> ... Level 150
    const levelMatch = html.match(/(?:Requirements|Level|Req).*?(\d{3})/i);
    // This regex is very loose. Fandom often has "Level: 160" inside a <td>.
    // Let's try searching for "Level" followed by digits.
    const strictLevelMatch = html.match(/Level\s*(\d+)/i);
    let level = strictLevelMatch ? parseInt(strictLevelMatch[1]) : 0;

    // Fallback if 0: Arcane Umbra is 200, Gollux 140/150, Boss varies.
    // Better regex for table cell: <div class="pi-data-value ...">... 160 ...</div>

    // 3. Type
    // Look for "Type" header in infobox
    // <h3 class="pi-data-label ...">Type</h3><div class="pi-data-value ...">Earrings</div>
    const typeMatch = html.match(/>Type<\/[\w]+>[\s\S]*?class="pi-data-value[^"]*">([\w\s]+)</); // simplified
    let type = typeMatch ? typeMatch[1].trim() : 'Unknown';
    if (!typeMatch) {
        // Backup: Try to find "Category:..." or just infer from name
        if (fallbackName.includes('Earring')) type = 'Earring';
        else if (fallbackName.includes('Ring')) type = 'Ring';
        else if (fallbackName.includes('Pendant')) type = 'Pendant';
        else if (fallbackName.includes('Belt')) type = 'Belt';
        else if (fallbackName.includes('Hat')) type = 'Hat';
        else if (fallbackName.includes('Shoes')) type = 'Shoes';
        else if (fallbackName.includes('Gloves')) type = 'Gloves';
        else if (fallbackName.includes('Cape')) type = 'Cape';
        else if (fallbackName.includes('Shoulder')) type = 'Shoulder';
        else if (fallbackName.includes('Mark')) type = 'Eye Accessory'; // Papulatus/Black Bean/Aquatic
    }

    // Normalizations
    if (type === 'Face Accessory') type = 'Face Acc.';
    if (type === 'Eye Accessory') type = 'Eye Acc.';
    if (type === 'Earrings') type = 'Earring'; // Singularize if needed by Enum? Enum has 'Earring'.

    // Determine Slots
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

    console.log(`Scraping ${itemsToScrape.length} items...`);

    for (const item of itemsToScrape) {
        try {
            console.log(`Fetching ${item.name}...`);
            const html = await fetchUrl(item.url);
            const data = extractData(html, item.name);

            results.push({
                name: item.name,
                set: item.set,
                ...data
            });

            // Random delay to be nice
            await new Promise(r => setTimeout(r, 200));

        } catch (e) {
            console.error(`Failed to scrape ${item.name}: ${e.message}`);
        }
    }

    fs.writeFileSync('scraped_items.json', JSON.stringify(results, null, 2));
    console.log('Done! Saved to scraped_items.json');
}

main();
