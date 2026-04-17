export interface SymbolDefinition {
    name: string;
    type: 'arcane' | 'sacred';
    shortName: string;
    maxLevel: number;
    color: string;
}

export const SYMBOLS: SymbolDefinition[] = [
    // Arcane Symbols (max level 20)
    { name: 'Vanishing Journey',  type: 'arcane', shortName: 'VJ',   maxLevel: 20, color: '#818cf8' },
    { name: 'Chu Chu Island',     type: 'arcane', shortName: 'ChuChu', maxLevel: 20, color: '#f472b6' },
    { name: 'Lachelein',          type: 'arcane', shortName: 'Lach',  maxLevel: 20, color: '#a78bfa' },
    { name: 'Arcana',             type: 'arcane', shortName: 'Arc',   maxLevel: 20, color: '#38bdf8' },
    { name: 'Morass',             type: 'arcane', shortName: 'Mor',   maxLevel: 20, color: '#34d399' },
    { name: 'Esfera',             type: 'arcane', shortName: 'Esf',   maxLevel: 20, color: '#fb923c' },
    // Sacred / Authentic Symbols (max level 11)
    { name: 'Cernium',            type: 'sacred', shortName: 'Cer',   maxLevel: 11, color: '#fbbf24' },
    { name: 'Hotel Arcus',        type: 'sacred', shortName: 'Arc',   maxLevel: 11, color: '#f87171' },
    { name: 'Odium',              type: 'sacred', shortName: 'Odi',   maxLevel: 11, color: '#c084fc' },
    { name: 'Shangri-La',         type: 'sacred', shortName: 'Sha',   maxLevel: 11, color: '#4ade80' },
    { name: 'Arteria',            type: 'sacred', shortName: 'Art',   maxLevel: 11, color: '#60a5fa' },
    { name: 'Carcion',            type: 'sacred', shortName: 'Car',   maxLevel: 11, color: '#e879f9' },
];

export const ARCANE_SYMBOLS = SYMBOLS.filter(s => s.type === 'arcane');
export const SACRED_SYMBOLS  = SYMBOLS.filter(s => s.type === 'sacred');
