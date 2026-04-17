const CDN = 'https://pub-37581592c5a045f3ad8b1881608a2769.r2.dev/images%2Fequips%2Fsymbols%2F';

export interface SymbolDefinition {
    name: string;
    type: 'arcane' | 'sacred';
    shortName: string;
    maxLevel: number;
    color: string;
    imageUrl: string;
}

export const SYMBOLS: SymbolDefinition[] = [
    // Arcane Symbols (max level 20)
    { name: 'Vanishing Journey',        type: 'arcane', shortName: 'VJ',     maxLevel: 20, color: '#818cf8', imageUrl: `${CDN}symbol-rte.png` },
    { name: 'Chu Chu Island',           type: 'arcane', shortName: 'ChuChu', maxLevel: 20, color: '#f472b6', imageUrl: `${CDN}symbol-cci.png` },
    { name: 'Lachelein',                type: 'arcane', shortName: 'Lach',   maxLevel: 20, color: '#a78bfa', imageUrl: `${CDN}symbol-lacheln.png` },
    { name: 'Arcana',                   type: 'arcane', shortName: 'Arc',    maxLevel: 20, color: '#38bdf8', imageUrl: `${CDN}symbol-arcana.png` },
    { name: 'Morass',                   type: 'arcane', shortName: 'Mor',    maxLevel: 20, color: '#34d399', imageUrl: `${CDN}symbol-moras.png` },
    { name: 'Esfera',                   type: 'arcane', shortName: 'Esf',    maxLevel: 20, color: '#fb923c', imageUrl: `${CDN}symbol-esfera.png` },
    // Sacred / Authentic Symbols (max level 11)
    { name: 'Cernium',                  type: 'sacred', shortName: 'Cer',    maxLevel: 11, color: '#fbbf24', imageUrl: `${CDN}symbol-cernium.png` },
    { name: 'Hotel Arcus',              type: 'sacred', shortName: 'Arc',    maxLevel: 11, color: '#f87171', imageUrl: `${CDN}symbol-hotel-arcs.png` },
    { name: 'Odium',                    type: 'sacred', shortName: 'Odi',    maxLevel: 11, color: '#c084fc', imageUrl: `${CDN}symbol-odium.png` },
    { name: 'Shangri-La',               type: 'sacred', shortName: 'Sha',    maxLevel: 11, color: '#4ade80', imageUrl: `${CDN}symbol-dwk.png` },
    { name: 'Arteria',                  type: 'sacred', shortName: 'Art',    maxLevel: 11, color: '#60a5fa', imageUrl: `${CDN}symbol-arteria.png` },
    { name: 'Carcion',                  type: 'sacred', shortName: 'Car',    maxLevel: 11, color: '#e879f9', imageUrl: `${CDN}symbol-carcion.png` },
    { name: 'Tallahart',                type: 'sacred', shortName: 'Tal',    maxLevel: 11, color: '#f97316', imageUrl: `${CDN}symbol-tallahart.png` },
    { name: 'Geardrak',                 type: 'sacred', shortName: 'Gea',    maxLevel: 11, color: '#94a3b8', imageUrl: `${CDN}symbol-geardrak.png` },
];

export const ARCANE_SYMBOLS = SYMBOLS.filter(s => s.type === 'arcane');
export const SACRED_SYMBOLS  = SYMBOLS.filter(s => s.type === 'sacred');

export const ARCANE_MAX = ARCANE_SYMBOLS.reduce((s, sym) => s + sym.maxLevel, 0); // 120
export const SACRED_MAX  = SACRED_SYMBOLS.reduce((s, sym) => s + sym.maxLevel, 0); // 88
