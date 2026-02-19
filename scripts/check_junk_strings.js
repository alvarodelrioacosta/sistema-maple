
import fs from 'fs/promises';

const keywords = [
    "Chance to obtain the stat",
    "Does not apply",
    "Reflect damage at a chance",
    "MP cost reduction"
];

const data = JSON.parse(await fs.readFile('potentials_formatted.json', 'utf8'));

console.log("Searching in Main Potentials:");
data.main_potential.forEach(p => {
    keywords.forEach(k => {
        if (p.potential_name.includes(k)) {
            console.log(`[MATCH] "${p.potential_name}"`);
        }
    });
});
