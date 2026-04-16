export interface CategorySpec {
    category: string;
    subcategory: string;
}

export const FINANCE_CATEGORIES = {
    MAPLE: 'Maple',
    TRANSFER: 'Transfer'
};

export const FINANCE_SUBCATEGORIES = {
    ITEMS_CUBES: 'Items / Cubes',
    MESOS: 'Mesos',
    OPERATING_EXPENSES: 'Operating Expenses',
    POWERLEVELING: 'Powerleveling',
    TRANSFER: 'Transfer'
};

export const CATEGORY_MAP: Record<string, string[]> = {
    [FINANCE_CATEGORIES.MAPLE]: [
        FINANCE_SUBCATEGORIES.ITEMS_CUBES,
        FINANCE_SUBCATEGORIES.MESOS,
        FINANCE_SUBCATEGORIES.OPERATING_EXPENSES,
        FINANCE_SUBCATEGORIES.POWERLEVELING
    ],
    [FINANCE_CATEGORIES.TRANSFER]: [
        FINANCE_SUBCATEGORIES.TRANSFER
    ]
};

export const autoCategorize = (
    type: string,
    description: string,
    context?: {
        isMeso?: boolean;
        isExchange?: boolean;
        isSession?: boolean;
        isAR?: boolean;
    }
): CategorySpec => {
    const desc = description.toLowerCase();

    if (type === 'transfer' || desc.includes('transfer to') || desc.includes('transfer from')) {
        return { category: FINANCE_CATEGORIES.TRANSFER, subcategory: FINANCE_SUBCATEGORIES.TRANSFER };
    }

    if (desc.includes('trade fee') || desc.includes('auction house fee') || desc.includes('fee')) {
        return { category: FINANCE_CATEGORIES.MAPLE, subcategory: FINANCE_SUBCATEGORIES.OPERATING_EXPENSES };
    }

    if (context?.isExchange || desc.includes('exchange') || desc.includes('buy mesos') || desc.includes('sell mesos')) {
        return { category: FINANCE_CATEGORIES.MAPLE, subcategory: FINANCE_SUBCATEGORIES.MESOS };
    }

    if (context?.isSession || desc.includes('cubing session') || desc.includes('psok')) {
        return { category: FINANCE_CATEGORIES.MAPLE, subcategory: FINANCE_SUBCATEGORIES.OPERATING_EXPENSES };
    }

    if (desc.includes('training') || desc.includes('leveling')) {
        return { category: FINANCE_CATEGORIES.MAPLE, subcategory: FINANCE_SUBCATEGORIES.POWERLEVELING };
    }

    return { category: FINANCE_CATEGORIES.MAPLE, subcategory: FINANCE_SUBCATEGORIES.ITEMS_CUBES };
};
