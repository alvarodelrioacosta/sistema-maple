import { TransactionType } from '../types';

export interface CategorySpec {
    category: string;
    subcategory: string;
}

export const FINANCE_CATEGORIES = {
    HOUSING: 'Housing & Services',
    DAILY_LIFE: 'Daily Life',
    TRANSPORT: 'Transport & Vehicle',
    ENTERTAINMENT: 'Entertainment & Development',
    FINANCIAL: 'Financial',
    MAPLE: 'Maple',
    WORK: 'Work',
    TRANSFER: 'Transfer'
};

export const FINANCE_SUBCATEGORIES = {
    // Housing & Services
    RENT_UTILITIES: 'Rent & Utilities',
    SERVICES: 'Services',
    MAINTENANCE: 'Maintenance & Home',

    // Daily Life
    FOOD: 'Food & Dining',
    HEALTH: 'Health',
    PERSONAL_CARE: 'Personal Care',
    CLOTHING: 'Clothing & Footwear',
    MISCELLANEOUS: 'Miscellaneous',

    // Transport
    PUBLIC_TRANSPORT: 'Public Transport',
    VEHICLE: 'My Vehicle',

    // Entertainment
    SOCIAL: 'Social & Outings',
    DIGITAL_LEISURE: 'Digital Leisure',
    TRAVEL: 'Travel & Vacations',
    EDUCATION: 'Education',

    // Financial
    INVESTMENTS: 'Investments & Returns',
    FEES: 'Fees & Commissions',
    LOANS: 'Loans',

    // Maple
    ITEMS_CUBES: 'Items / Cubes',
    MESOS: 'Mesos',
    OPERATING_EXPENSES: 'Operating Expenses',
    POWERLEVELING: 'Powerleveling',

    // Work
    SALARY: 'Salaries & Fees',
    OTHER_WORK_INCOME: 'Other Work Income',

    // Transfer
    TRANSFER: 'Transfer'
};

export const CATEGORY_MAP: Record<string, string[]> = {
    [FINANCE_CATEGORIES.HOUSING]: [
        FINANCE_SUBCATEGORIES.RENT_UTILITIES,
        FINANCE_SUBCATEGORIES.SERVICES,
        FINANCE_SUBCATEGORIES.MAINTENANCE
    ],
    [FINANCE_CATEGORIES.DAILY_LIFE]: [
        FINANCE_SUBCATEGORIES.FOOD,
        FINANCE_SUBCATEGORIES.HEALTH,
        FINANCE_SUBCATEGORIES.PERSONAL_CARE,
        FINANCE_SUBCATEGORIES.CLOTHING,
        FINANCE_SUBCATEGORIES.MISCELLANEOUS
    ],
    [FINANCE_CATEGORIES.TRANSPORT]: [
        FINANCE_SUBCATEGORIES.PUBLIC_TRANSPORT,
        FINANCE_SUBCATEGORIES.VEHICLE
    ],
    [FINANCE_CATEGORIES.ENTERTAINMENT]: [
        FINANCE_SUBCATEGORIES.SOCIAL,
        FINANCE_SUBCATEGORIES.DIGITAL_LEISURE,
        FINANCE_SUBCATEGORIES.TRAVEL,
        FINANCE_SUBCATEGORIES.EDUCATION
    ],
    [FINANCE_CATEGORIES.FINANCIAL]: [
        FINANCE_SUBCATEGORIES.INVESTMENTS,
        FINANCE_SUBCATEGORIES.FEES,
        FINANCE_SUBCATEGORIES.LOANS
    ],
    [FINANCE_CATEGORIES.MAPLE]: [
        FINANCE_SUBCATEGORIES.ITEMS_CUBES,
        FINANCE_SUBCATEGORIES.MESOS,
        FINANCE_SUBCATEGORIES.OPERATING_EXPENSES,
        FINANCE_SUBCATEGORIES.POWERLEVELING
    ],
    [FINANCE_CATEGORIES.WORK]: [
        FINANCE_SUBCATEGORIES.SALARY,
        FINANCE_SUBCATEGORIES.OTHER_WORK_INCOME
    ],
    [FINANCE_CATEGORIES.TRANSFER]: [
        FINANCE_SUBCATEGORIES.TRANSFER
    ]
};

export const autoCategorize = (
    type: TransactionType,
    description: string,
    context?: {
        isMeso?: boolean;
        isExchange?: boolean;
        isSession?: boolean;
        isAR?: boolean;
        isInterest?: boolean;
    }
): CategorySpec => {
    const desc = description.toLowerCase();

    // 0. Explicit Transfer check
    if (type === 'transfer' || desc.includes('transfer to') || desc.includes('transfer from')) {
        return { category: FINANCE_CATEGORIES.TRANSFER, subcategory: FINANCE_SUBCATEGORIES.TRANSFER };
    }

    // 1. Maple Flow
    if (context?.isMeso || context?.isSession || desc.includes('mesos') || desc.includes('cube') || desc.includes('session')) {
        // Priority for Fees
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
    }

    // 2. Financial / Loans
    if (context?.isInterest || desc.includes('interest') || desc.includes('préstamo') || desc.includes('prestamo') || desc.includes('loan')) {
        return { category: FINANCE_CATEGORIES.FINANCIAL, subcategory: FINANCE_SUBCATEGORIES.LOANS };
    }

    if (desc.includes('rendimiento') || desc.includes('dividend') || desc.includes('gain') || desc.includes('returns')) {
        return { category: FINANCE_CATEGORIES.FINANCIAL, subcategory: FINANCE_SUBCATEGORIES.INVESTMENTS };
    }

    if (desc.includes('comisión') || desc.includes('comision') || desc.includes('fee') || desc.includes('commission')) {
        return { category: FINANCE_CATEGORIES.FINANCIAL, subcategory: FINANCE_SUBCATEGORIES.FEES };
    }

    // 3. Work
    if (desc.includes('sueldo') || desc.includes('salary') || desc.includes('payroll') || desc.includes('honorarios')) {
        return { category: FINANCE_CATEGORIES.WORK, subcategory: FINANCE_SUBCATEGORIES.SALARY };
    }

    // Default Fallbacks based on common keywords
    if (desc.includes('alquiler') || desc.includes('expensas') || desc.includes('rent') || desc.includes('utilities')) {
        return { category: FINANCE_CATEGORIES.HOUSING, subcategory: FINANCE_SUBCATEGORIES.RENT_UTILITIES };
    }

    if (desc.includes('luz') || desc.includes('agua') || desc.includes('gas') || desc.includes('internet') || desc.includes('teléfono') || desc.includes('celular') || desc.includes('electricity') || desc.includes('water') || desc.includes('phone')) {
        return { category: FINANCE_CATEGORIES.HOUSING, subcategory: FINANCE_SUBCATEGORIES.SERVICES };
    }

    if (desc.includes('supermercado') || desc.includes('comida') || desc.includes('dieta') || desc.includes('food') || desc.includes('market') || desc.includes('restaurant')) {
        return { category: FINANCE_CATEGORIES.DAILY_LIFE, subcategory: FINANCE_SUBCATEGORIES.FOOD };
    }

    if (desc.includes('gimnasio') || desc.includes('gym') || desc.includes('peluquería') || desc.includes('beauty') || desc.includes('care') || desc.includes('personal')) {
        return { category: FINANCE_CATEGORIES.DAILY_LIFE, subcategory: FINANCE_SUBCATEGORIES.PERSONAL_CARE };
    }

    if (desc.includes('médico') || desc.includes('salud') || desc.includes('farmacia') || desc.includes('remedio') || desc.includes('pharmacy') || desc.includes('doctor')) {
        return { category: FINANCE_CATEGORIES.DAILY_LIFE, subcategory: FINANCE_SUBCATEGORIES.HEALTH };
    }

    // Default based on type if no keywords found
    if (type === 'income') {
        return { category: FINANCE_CATEGORIES.WORK, subcategory: FINANCE_SUBCATEGORIES.OTHER_WORK_INCOME };
    }

    return { category: FINANCE_CATEGORIES.DAILY_LIFE, subcategory: FINANCE_SUBCATEGORIES.MISCELLANEOUS };
};
