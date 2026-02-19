
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

async function scrape() {
    console.log(`Fetching ${URL}...`);
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const mainPotentials = [];
    const bonusPotentials = [];

    // Find the starting H2 (Potentials List)
    let startNode = null;
    $('.mw-parser-output h2').each((i, el) => {
        if ($(el).text().includes('Potentials List')) {
            startNode = $(el);
        }
    });

    if (!startNode) {
        // Fallback
        const span = $('#Potentials_List');
        if (span.length) startNode = span.parent();
    }

    if (!startNode) return console.log('Start node not found');

    console.log('Found Start Node:', startNode.text());

    let currentNode = startNode.next();
    let currentItemType = 'Unknown';
    let currentSection = 'Main';
    let currentRank = 'Any';

    while (currentNode.length > 0) {
        const tagName = currentNode[0].tagName.toLowerCase();
        let text = currentNode.text().trim();

        // Normalize text logs
        // console.log(`[${tagName}] ${text.substring(0, 30)}`);

        if (tagName === 'h2') {
            if (text.includes('Bonus Potential Stat List')) {
                currentSection = 'Bonus';
                console.log('--- BONUS SECTION ---');
            } else if (text.includes('References') || text.includes('External links')) {
                break;
            }
        } else if (tagName === 'h3') {
            currentItemType = mapItemType(text);
            console.log(`Item Type: ${currentItemType}`);
        } else if (tagName === 'h4') {
            if (['Rare', 'Epic', 'Unique', 'Legendary'].some(r => text.includes(r))) {
                currentRank = ['Rare', 'Epic', 'Unique', 'Legendary'].find(r => text.includes(r));
                console.log(`Rank: ${currentRank}`);
            }
        }

        // Check for tables (could be the node itself or inside a div)
        let tables = [];
        if (tagName === 'table') {
            tables.push(currentNode);
        } else if (tagName === 'div' || tagName === 'center') {
            const children = currentNode.find('table');
            if (children.length) {
                children.each((i, t) => tables.push($(t)));
            }
        }

        tables.forEach((tableNode) => {
            // Process table
            // console.log(`Processing table...`);
            const headers = tableNode.find('th').map((i, el) => $(el).text().trim()).get();

            // Check headers
            const level71Idx = headers.findIndex(h => h.includes('71') || h.includes('70+') || h.includes('Level 0+'));

            if (headers.length > 0 && (level71Idx > -1 || headers.some(h => h.includes('Stat') || h.includes('Potential')))) {

                const rows = tableNode.find('tr');
                rows.each((i, row) => {
                    const cells = $(row).find('td');
                    if (cells.length === 0) return;

                    const stat = $(cells[0]).text().trim();
                    if (!stat) return;

                    // Value
                    let valIndex = level71Idx > -1 ? level71Idx : cells.length - 1;
                    if (valIndex >= cells.length) valIndex = cells.length - 1;

                    const val = $(cells[valIndex]).text().trim();

                    // Filter
                    if (val && val !== '-' && !stat.includes('Potential')) {
                        const entry = {
                            item_type: currentItemType,
                            rank: currentRank,
                            line_type: 'Prime',
                            stat: stat,
                            level_scaling: val // Often stores simply the value "+6" or "3%"
                        };

                        if (currentSection === 'Main') {
                            mainPotentials.push(entry);
                        } else {
                            bonusPotentials.push(entry);
                        }
                    }
                });
            }
        });

        currentNode = currentNode.next();
    }

    console.log(`Found ${mainPotentials.length} Main Potentials and ${bonusPotentials.length} Bonus Potentials.`);

    const output = {
        main_potential: mainPotentials,
        bonus_potential: bonusPotentials
    };

    await fs.writeFile('potentials.json', JSON.stringify(output, null, 2));
}

scrape().catch(console.error);
