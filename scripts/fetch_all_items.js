
import fs from 'fs';

const itemsToFetch = [
    // Gollux
    { name: 'Reinforced Gollux Earrings', set: 'Reinforced Gollux Set' },
    { name: 'Reinforced Gollux Ring', set: 'Reinforced Gollux Set' },
    { name: 'Reinforced Engraved Gollux Pendant', set: 'Reinforced Gollux Set' },
    { name: 'Reinforced Engraved Gollux Belt', set: 'Reinforced Gollux Set' },

    // Boss Accessory
    { name: 'Horntail Necklace', set: 'Boss Accessory Set' },
    { name: 'Papulatus Mark', set: 'Boss Accessory Set' },
    { name: 'Black Bean Mark', set: 'Boss Accessory Set' },
];

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
        itemsToFetch.push({
            name: `Arcane Umbra ${job.name} ${part}`,
            set: job.set
        });
    });
});

function mapType(subCategory, category) {
    if (subCategory === 'Earrings') return 'Earring';
    if (subCategory === 'Eye Accessory') return 'Eye Acc.';
    if (subCategory === 'Face Accessory') return 'Face Acc.';
    if (subCategory === 'Shoulderpad') return 'Shoulder';
    // Fallbacks
    if (subCategory) return subCategory;
    return 'Unknown';
}

async function fetchItem(itemInfo) {
    const url = `https://maplestory.io/api/gms/253/item?searchFor=${encodeURIComponent(itemInfo.name)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json.length === 0) throw new Error('Not found');

    // Pick the best match (exact match if possible)
    const exactMatch = json.find(i => i.name.toLowerCase() === itemInfo.name.toLowerCase());
    const item = exactMatch || json[0];

    const type = mapType(item.typeInfo.subCategory, item.typeInfo.category);

    let slots = 0;
    if (item.name.includes('Eternal')) slots = 10;

    return {
        name: item.name,
        type: type,
        item_lv: item.requiredLevel,
        slots: slots,
        image_url: `https://maplestory.io/api/gms/253/item/${item.id}/icon`,
        set: itemInfo.set
    };
}

async function main() {
    const results = [];
    console.log(`Fetching ${itemsToFetch.length} items...`);

    for (const item of itemsToFetch) {
        try {
            console.log(`Fetching ${item.name}...`);
            const data = await fetchItem(item);
            console.log(`  -> Found Level: ${data.item_lv}, Type: ${data.type}`);
            results.push(data);
        } catch (e) {
            console.error(`Failed to fetch ${item.name}: ${e.message}`);
        }
        // Small delay
        // await new Promise(r => setTimeout(r, 50));
    }

    fs.writeFileSync('final_items.json', JSON.stringify(results, null, 2));
    console.log('Done! Saved to final_items.json');
}

main();
