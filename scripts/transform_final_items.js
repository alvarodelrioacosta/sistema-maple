
import fs from 'fs';

const validTypes = [
    'Hat', 'Top', 'Bottom', 'Gloves', 'Shoes', 'Cape', 'Belt', 'Shoulder',
    'Face Acc.', 'Eye Acc.', 'Ring', 'Earring', 'Pendant', 'Weapon',
    'Secondary', 'Emblem', 'Heart', 'Pocket', 'Badge'
];

function transform() {
    const raw = fs.readFileSync('final_items.json', 'utf-8');
    const items = JSON.parse(raw);
    const fixed = items.map(item => {
        let t = item.type;

        // Mappings
        if (t === 'Glove') t = 'Gloves';
        if (t === 'Shoulder Accessory') t = 'Shoulder';
        if (t === 'Eye Decoration') t = 'Eye Acc.';
        if (t === 'Face Decoration') t = 'Face Acc.';
        if (t === 'Earrings') t = 'Earring';

        // Validation
        if (!validTypes.includes(t)) {
            console.warn(`Warning: Unknown type '${t}' for item '${item.name}'`);
        }

        return { ...item, type: t };
    });

    fs.writeFileSync('final_items.json', JSON.stringify(fixed, null, 2));
    console.log(`Transformed ${fixed.length} items.`);
}

transform();
