const CDN = 'https://pub-37581592c5a045f3ad8b1881608a2769.r2.dev/images%2Fequips%2Fsymbols%2F';

export interface SymbolDefinition {
    name: string;
    type: 'arcane' | 'sacred';
    shortName: string;
    maxLevel: number;
    unlockLevel: number;
    color: string;
    imageUrl: string;
    column: string; // column name in the characters table
}

export const SYMBOLS: SymbolDefinition[] = [
    // Arcane Symbols (max level 20)
    { name: 'Vanishing Journey', type: 'arcane', shortName: 'VJ',     maxLevel: 20, unlockLevel: 200, color: '#818cf8', imageUrl: `${CDN}symbol-rte.png`,         column: 'sym_vj'     },
    { name: 'Chu Chu Island',    type: 'arcane', shortName: 'ChuChu', maxLevel: 20, unlockLevel: 210, color: '#f472b6', imageUrl: `${CDN}symbol-cci.png`,         column: 'sym_chuchu' },
    { name: 'Lachelein',         type: 'arcane', shortName: 'Lach',   maxLevel: 20, unlockLevel: 220, color: '#a78bfa', imageUrl: `${CDN}symbol-lacheln.png`,     column: 'sym_lach'   },
    { name: 'Arcana',            type: 'arcane', shortName: 'Arc',    maxLevel: 20, unlockLevel: 225, color: '#38bdf8', imageUrl: `${CDN}symbol-arcana.png`,      column: 'sym_arc'    },
    { name: 'Morass',            type: 'arcane', shortName: 'Mor',    maxLevel: 20, unlockLevel: 230, color: '#34d399', imageUrl: `${CDN}symbol-moras.png`,       column: 'sym_mor'    },
    { name: 'Esfera',            type: 'arcane', shortName: 'Esf',    maxLevel: 20, unlockLevel: 235, color: '#fb923c', imageUrl: `${CDN}symbol-esfera.png`,      column: 'sym_esf'    },
    // Sacred / Authentic Symbols (max level 11)
    { name: 'Cernium',           type: 'sacred', shortName: 'Cer',    maxLevel: 11, unlockLevel: 260, color: '#fbbf24', imageUrl: `${CDN}symbol-cernium.png`,     column: 'sym_cer'    },
    { name: 'Hotel Arcus',       type: 'sacred', shortName: 'HArc',   maxLevel: 11, unlockLevel: 265, color: '#f87171', imageUrl: `${CDN}symbol-hotel-arcs.png`,  column: 'sym_harc'   },
    { name: 'Odium',             type: 'sacred', shortName: 'Odi',    maxLevel: 11, unlockLevel: 270, color: '#c084fc', imageUrl: `${CDN}symbol-odium.png`,       column: 'sym_odi'    },
    { name: 'Shangri-La',        type: 'sacred', shortName: 'Sha',    maxLevel: 11, unlockLevel: 275, color: '#4ade80', imageUrl: `${CDN}symbol-dwk.png`,         column: 'sym_sha'    },
    { name: 'Arteria',           type: 'sacred', shortName: 'Art',    maxLevel: 11, unlockLevel: 280, color: '#60a5fa', imageUrl: `${CDN}symbol-arteria.png`,     column: 'sym_art'    },
    { name: 'Carcion',           type: 'sacred', shortName: 'Car',    maxLevel: 11, unlockLevel: 285, color: '#e879f9', imageUrl: `${CDN}symbol-carcion.png`,     column: 'sym_car'    },
    { name: 'Tallahart',         type: 'sacred', shortName: 'Tal',    maxLevel: 11, unlockLevel: 290, color: '#f97316', imageUrl: `${CDN}symbol-tallahart.png`,   column: 'sym_tal'    },
    { name: 'Geardrak',          type: 'sacred', shortName: 'Gea',    maxLevel: 11, unlockLevel: 295, color: '#94a3b8', imageUrl: `${CDN}symbol-geardrak.png`,    column: 'sym_gea'    },
];

export const ARCANE_SYMBOLS = SYMBOLS.filter(s => s.type === 'arcane');
export const SACRED_SYMBOLS  = SYMBOLS.filter(s => s.type === 'sacred');

export const ARCANE_MAX = ARCANE_SYMBOLS.reduce((s, sym) => s + sym.maxLevel, 0); // 120
export const SACRED_MAX  = SACRED_SYMBOLS.reduce((s, sym) => s + sym.maxLevel, 0); // 88

export function getAvailableSymbols(level: number): SymbolDefinition[] {
    return SYMBOLS.filter(s => level >= s.unlockLevel);
}

export function getAvailableMax(type: 'arcane' | 'sacred', level: number): number {
    return SYMBOLS
        .filter(s => s.type === type && level >= s.unlockLevel)
        .reduce((sum, s) => sum + s.maxLevel, 0);
}
