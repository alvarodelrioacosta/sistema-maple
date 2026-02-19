
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const itemsPath = path.join(__dirname, 'items.json');
const outputPath = path.join(__dirname, 'filtered_items.json');

try {
    const data = fs.readFileSync(itemsPath, 'utf8');
    const items = JSON.parse(data);

    const filteredItems = items.filter(item => item.Type !== 'Weapon');

    fs.writeFileSync(outputPath, JSON.stringify(filteredItems, null, 2));

    console.log(`Original count: ${items.length}`);
    console.log(`Filtered count: ${filteredItems.length}`);
    console.log(`Removed: ${items.length - filteredItems.length} items of type 'Weapon'`);
} catch (err) {
    console.error('Error processing file:', err);
}
