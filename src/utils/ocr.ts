import type { ItemInsert, ItemDB, TradeabilityType, PotentialTier } from '../types';

export interface OcrResult extends Partial<ItemInsert> {
    success: boolean;
    error?: string;
}

export interface OcrOptions {
    expectedName?: string;
}

export const ocrUtil = {
    /**
     * Limpia y normaliza una línea de texto del OCR
     */
    cleanLine(line: string): string {
        return line
            .replace(/^[\s=+\-:.|★*▪]+/, '') // Elimina prefijos comunes de ruido, incluyendo ▪
            .replace(/Character Levels/gi, 'Char Lv')
            .replace(/[B5]TR/g, 'STR') // Error común de OCR: BTR o 5TR -> STR
            .replace(/Cooldowns/gi, 'CD') // Abreviatura solicitada
            .replace(/\+49%/g, '+9%') // Error específico solicitado: +49% -> +9%
            .replace(/\[te[rmn]{1,2}/gi, 'Item') // Error común: [tern, [tem, [ten, [term -> Item
            .replace(/\s+/g, ' ') // Normaliza espacios internos
            .trim();
    },

    /**
     * Determina si una línea parece ser una línea de potencial
     */
    isPotentialLine(line: string): boolean {
        const lower = line.toLowerCase();
        // Evitar líneas que definen el tier o encabezados
        if (lower.includes('potential') ||
            lower.includes('legendary') ||
            lower.includes('unique') ||
            lower.includes('epic') ||
            lower.includes('rare')) return false;

        return line.includes('+') ||
            line.includes('%') ||
            lower.includes('skill') ||
            lower.includes('recovery') ||
            lower.includes('ignore') ||
            lower.includes('boss') ||
            lower.includes('cd'); // Detectar CD (antes Cooldowns)
    },

    /**
     * Busca el tier de potencial en un rango de líneas
     */
    findTier(lines: string[], startIdx: number, endIdx: number): PotentialTier | null {
        for (let i = startIdx; i < endIdx && i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('Legendary')) return 'Legendary';
            if (line.includes('Unique')) return 'Unique';
            if (line.includes('Epic')) return 'Epic';
            if (line.includes('Rare')) return 'Rare';
        }
        return null;
    },

    /**
     * Extrae hasta 3 líneas de potencial
     */
    extractPotentialLines(lines: string[], startIdx: number, endIdx: number): string[] {
        const extracted: string[] = [];
        const scanStart = startIdx + 1;

        for (let i = scanStart; i < endIdx; i++) {
            const line = lines[i];
            if (this.isPotentialLine(line)) {
                extracted.push(this.cleanLine(line));
                if (extracted.length >= 3) break;
            }
        }
        return extracted;
    },

    /**
     * Procesa el texto crudo del OCR y devuelve las actualizaciones del ítem
     */
    processItemImageText(text: string, itemsDB: ItemDB[], options: OcrOptions = {}): OcrResult {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
        console.log("OCR Raw Lines:", lines);

        const updates: Partial<ItemInsert> = {};

        // 0. Validación de Nombre (Opcional)
        if (options.expectedName) {
            const expectedLower = options.expectedName.toLowerCase().trim();
            const textLower = text.toLowerCase();

            if (!textLower.includes(expectedLower)) {
                return {
                    success: false,
                    error: `Item name mismatch! The screenshot does not match "${options.expectedName}".`
                };
            }
        }

        // 1. Identificación del Nombre
        let foundName = '';
        const topLines = lines.slice(0, 8); // Aumentamos el rango de búsqueda inicial

        for (const line of topLines) {
            const lowerLine = line.toLowerCase();
            // Intento búsqueda exacta
            const exactMatch = itemsDB.find(db => db.name.toLowerCase() === lowerLine);
            if (exactMatch) {
                foundName = exactMatch.name;
                break;
            }
            // Intento búsqueda parcial inteligente
            const partialMatch = itemsDB.find(db =>
                lowerLine.includes(db.name.toLowerCase()) &&
                lowerLine.length < db.name.length + 15
            );
            if (partialMatch) {
                foundName = partialMatch.name;
                break;
            }
        }

        if (foundName) {
            updates.name = foundName;
            // Slots setting removed - now manual
        }

        // 2. Star Force - REMOVED (By user request)
        // updates.star_force detection logic removed to avoid inaccuracies.

        // 3. Potenciales (Detectamos índices primero para limitar área de tradeo)
        let potentialIndex = -1;
        let bonusPotentialIndex = -1;

        lines.forEach((line, idx) => {
            const lower = line.toLowerCase();
            if (lower.includes('bonus potential')) {
                bonusPotentialIndex = idx;
            } else if (lower.includes('potential') && potentialIndex === -1 && !lower.includes('reset')) {
                potentialIndex = idx;
            }
        });

        // 4. Tradeability (Solo buscamos ANTES del primer bloque de potencial)
        let tradeability: TradeabilityType | null = null;
        const tradeScanEnd = potentialIndex !== -1 ? potentialIndex : lines.length;

        for (let i = 0; i < tradeScanEnd; i++) {
            const line = lines[i];
            const lower = line.toLowerCase();

            // Tradeability con sistema de prioridad y palabras clave nuevas
            const str = lower.replace(/\s+/g, ' ');

            if (str.includes('once') || str.includes('transaction')) {
                // PRIORIDAD 1: Tradeable Once (No se sobreescribe)
                tradeability = 'Tradeable Once';
            } else if ((str.includes('untrada') || str.includes('untrade')) && tradeability !== 'Tradeable Once') {
                // PRIORIDAD 2: Untradable (Solo si no es Once)
                tradeability = 'Untradeable';
            } else if ((str.includes('cannot') || str.includes('when')) && !tradeability) {
                // PRIORIDAD 3: Tradeable (Solo si no hay nada detectado aún)
                tradeability = 'Tradeable';
            }
        }

        // 4b. Fallback final si no se detectó ninguna palabra clave en ninguna línea
        if (!tradeability) tradeability = 'Tradeable';

        if (tradeability) updates.tradeability = tradeability;
        // SF & Slots are now manual entry only.

        const mainEnd = bonusPotentialIndex !== -1 ? bonusPotentialIndex : lines.length;

        // Main Potential
        if (potentialIndex !== -1) {
            const tier = this.findTier(lines, potentialIndex, potentialIndex + 3);
            if (tier) updates.main_potential_tier = tier;

            const matches = this.extractPotentialLines(lines, potentialIndex, mainEnd);

            const finalizeLine = (line: string, tier: PotentialTier | null) => {
                if (tier === 'Legendary' && line.includes('STR')) {
                    // Reemplazamos +4% o +8% por +9% (solo si es el número completo)
                    return line.replace(/\b\+(4|8)%\b/, '+9%');
                }
                return line;
            };

            if (matches[0]) updates.main_potential_1 = finalizeLine(matches[0], updates.main_potential_tier || null);
            if (matches[1]) updates.main_potential_2 = finalizeLine(matches[1], updates.main_potential_tier || null);
            if (matches[2]) updates.main_potential_3 = finalizeLine(matches[2], updates.main_potential_tier || null);
        }

        // Bonus Potential
        if (bonusPotentialIndex !== -1) {
            const tier = this.findTier(lines, bonusPotentialIndex, bonusPotentialIndex + 3);
            if (tier) updates.bonus_potential_tier = tier;

            const matches = this.extractPotentialLines(lines, bonusPotentialIndex, lines.length);
            // Normalización de potenciales legendarios (STR: +4%/+8% -> +9%)
            const finalizeLine = (line: string, tier: PotentialTier | null) => {
                if (tier === 'Legendary' && line.includes('STR')) {
                    // Reemplazamos +4% o +8% por +9% (solo si es el número completo)
                    return line.replace(/\b\+(4|8)%\b/, '+9%');
                }
                return line;
            };

            if (matches[0]) updates.bonus_potential_1 = finalizeLine(matches[0], updates.bonus_potential_tier || null);
            if (matches[1]) updates.bonus_potential_2 = finalizeLine(matches[1], updates.bonus_potential_tier || null);
            if (matches[2]) updates.bonus_potential_3 = finalizeLine(matches[2], updates.bonus_potential_tier || null);
        }

        return { ...updates, success: true };
    },

};
