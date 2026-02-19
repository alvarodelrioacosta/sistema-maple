
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';

const URL = 'https://strategywiki.org/wiki/MapleStory/Potential_System';

const mapItemType = (header) => {
    header = (header || '').trim().replace(/\[edit\]/g, '');
    if (header.includes('Hat')) return 'Hat';
    if (header.includes('Top') && header.includes('Overall')) return 'Top/Overall';
    if (header.includes('Bottom')) return 'Bottom';
    if (header.includes('Shoes')) return 'Shoes';
    if (header.includes('Gloves')) return 'Gloves';
    if (header.includes('Cape') || header.includes('Belt') || header.includes('Shoulder')) return 'Cape/Belt/Shoulder';
    if (header.includes('Face') || header.includes('Eye') || header.includes('Ring') || header.includes('Pendant')) return 'Accessory';
    if (header.includes('Weapon')) return 'Weapon';
    if (header.includes('Secondary')) return 'Secondary';
    if (header.includes('Emblem')) return 'Emblem';
    if (header.includes('Heart') || header.includes('Badge')) return 'Heart/Badge';
    return header;
};

const parseHeaderStat = (text) => {
    const match = text.match(/^([\d%+\s]+)\s+(.*)$/);
    if (match) {
        return { value: match[1].trim(), name: match[2].trim() };
    }
    return { value: null, name: text };
};

async function scrape() {
    console.log(`Fetching ${URL}...`);
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const mainPotentials = [];
    const bonusPotentials = [];

    // Find all H4 headers - these define the Ranks
    const h4s = $('h4');
    console.log(`Found ${h4s.length} H4 headers.`);

    h4s.each((i, h4) => {
        const text = $(h4).text().trim();

        let rank = null;
        if (text.includes('Epic (Prime)')) rank = 'Epic';
        else if (text.includes('Unique (Prime)')) rank = 'Unique';
        else if (text.includes('Legendary (Prime)')) rank = 'Legendary';

        if (!rank) return; // Skip Rare/Non-prime

        // Context: Item Type
        // Traverse UP to find previous H3
        let prev = $(h4).prevAll('h3').first();
        if (!prev.length) {
            // Maybe it's nested?
            // If h4 is inside something, go to parent and check prevAll
            let parent = $(h4).parent();
            prev = parent.prevAll('h3').first();
        }

        const itemType = mapItemType(prev.text());

        // Context: Section (Main/Bonus)
        let section = 'Main';
        let prevH2 = $(h4).prevAll('h2').first();
        if (!prevH2.length) {
            let parent = $(h4).parent();
            prevH2 = parent.prevAll('h2').first();
        }
        if (prevH2.text().includes('Bonus Potential')) section = 'Bonus';

        // Scan siblings AFTER H4 until next H4 or H3
        let curr = $(h4).next();
        while (curr.length) {
            const tag = curr[0].tagName.toLowerCase();
            if (tag === 'h4' || tag === 'h3' || tag === 'h2') break; // End of scope

            let tables = [];
            if (tag === 'table') tables.push($(curr));
            else if (['div', 'p', 'center', 'dl'].includes(tag)) tables = curr.find('table').toArray().map(t => $(t));

            tables.forEach($table => {
                // Determine Name logic
                // 1. Check Previous Sibling of the Table (closest)
                // 2. If table is inside curr, check previous sibling of curr? 
                //    Or check element *inside* curr before table?

                // Let's rely on looking immediately before the *table node* in the DOM.
                let tPrev = $table.prev();
                while (tPrev.length && !tPrev.text().trim()) tPrev = tPrev.prev();

                let pName = 'Unknown';
                if (tPrev.length) pName = tPrev.text().trim().replace(/\[edit\]/g, '');

                // If pName is empty or just "edit", try parent's previous
                if (pName.length < 2) {
                    let parentPrev = $table.parent().prev();
                    if (parentPrev.length) pName = parentPrev.text().trim().replace(/\[edit\]/g, '');
                }

                // Filter Rows
                const rows = $table.find('tr');
                if (rank === 'Epic' && rows.length > 7) return;

                parseTable($, $table, section, itemType, rank, pName, mainPotentials, bonusPotentials);
            });

            curr = curr.next();
        }
    });

    console.log(`Extracted: ${mainPotentials.length} Main, ${bonusPotentials.length} Bonus.`);

    // Save
    const output = { main_potential: mainPotentials, bonus_potential: bonusPotentials };
    await fs.writeFile('potentials_formatted.json', JSON.stringify(output, null, 2));
}

function parseTable($, $table, section, itemType, rank, contextName, mainArr, bonusArr) {
    const headers = $table.find('th').map((i, el) => $(el).text().trim()).get();
    const isVertical = headers[0] && (headers[0].includes('Level') || headers[0].includes('Equip'));

    let entry = {
        item_type: itemType,
        rank: rank,
        potential_name: contextName,
        val_0_30: null,
        val_31_70: null,
        val_71: null,
        val_151: null,
        val_120: null
    };

    // Cleanup Name
    entry.potential_name = entry.potential_name.split('[')[0].trim();
    if (entry.potential_name === rank || entry.potential_name.includes('Prime')) {
        // This implies the table *is* the rank section. Likely generic stats like "All Stats".
        // Or parsing failed. Let's keep it but mark it.
    }

    const parsedHeader = parseHeaderStat(entry.potential_name);
    if (parsedHeader.value) {
        entry.potential_name = parsedHeader.name;
    }

    if (isVertical) {
        $table.find('tr').slice(1).each((i, row) => {
            const cells = $(row).find('td');
            if (cells.length < 2) return;

            const range = $(cells[0]).text().trim();
            const val = $(cells[1]).text().trim();

            if (range.includes('0-30')) entry.val_0_30 = val;
            else if (range.includes('31-70')) entry.val_31_70 = val;
            else if (range.includes('71') && !range.includes('151')) entry.val_71 = val;
            else if (range.includes('151')) entry.val_151 = val;
            else if (range.includes('120')) {
                if (parsedHeader.value) entry.val_120 = parsedHeader.value;
                else entry.val_120 = val;
            }
        });
    } else {
        // Horizontal Logic
        // ... (Same as before)
    }

    const hasValues = entry.val_0_30 || entry.val_31_70 || entry.val_71 || entry.val_151 || entry.val_120;

    if (hasValues) {
        if (section === 'Main') mainArr.push(entry);
        else bonusArr.push(entry);
    }
}

scrape().catch(console.error);
