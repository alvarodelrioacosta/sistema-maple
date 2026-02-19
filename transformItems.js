
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, 'filtered_items.json');
// We will overwrite the file as per the implicit workflow
const outputPath = path.join(__dirname, 'filtered_items.json');

try {
    const data = fs.readFileSync(inputPath, 'utf8');
    const items = JSON.parse(data);

    const transformedItems = items.map(item => {
        // Create a new object to maintain order or just modify
        const newItem = { ...item };

        // Process Requirements field
        if (newItem.Requirements) {
            // Remove "Level " text
            const levelValue = newItem.Requirements.replace('Level ', '').trim();

            // Add Level field (convert to number if needed, but user asked for number, 
            // usually implies type number but let's keep string if they want, 
            // though "quede un numero" usually implies just the digits. 
            // Let's store it as a number for cleaner JSON if valid, or string if not sure.
            // Given the input "Level 140", parsing to Int is safer.)
            // actually "quede un numero" might just mean the characters. 
            // I will make it a number type if it is a valid number, otherwise keep string digits.
            // Re-reading: "elimines 'Level ' para que unicamente quede un numero". 
            // I'll assume string representation of the number to be safe, or just the number type.
            // Let's use Number() parser for better data quality.

            newItem.Level = isNaN(Number(levelValue)) ? levelValue : Number(levelValue);

            // Remove old field
            delete newItem.Requirements;
        }

        return newItem;
    });

    fs.writeFileSync(outputPath, JSON.stringify(transformedItems, null, 2));

    console.log(`Transformed ${items.length} items successfully.`);

} catch (err) {
    console.error('Error processing file:', err);
}
