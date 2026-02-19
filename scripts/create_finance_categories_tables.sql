-- Finance Categories & Subcategories Tables

CREATE TABLE IF NOT EXISTS finance_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES finance_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- Initial Data (English)
INSERT INTO finance_categories (name, is_system) VALUES 
('Housing & Services', true),
('Daily Life', true),
('Transport & Vehicle', true),
('Entertainment & Development', true),
('Financial', true),
('Maple', true),
('Work', true)
ON CONFLICT (name) DO NOTHING;

-- Housing & Services
INSERT INTO finance_subcategories (category_id, name, is_system)
SELECT id, 'Rent & Utilities', true FROM finance_categories WHERE name = 'Housing & Services' UNION ALL
SELECT id, 'Services', true FROM finance_categories WHERE name = 'Housing & Services' UNION ALL
SELECT id, 'Maintenance & Home', true FROM finance_categories WHERE name = 'Housing & Services'
ON CONFLICT DO NOTHING;

-- Daily Life
INSERT INTO finance_subcategories (category_id, name, is_system)
SELECT id, 'Food & Dining', true FROM finance_categories WHERE name = 'Daily Life' UNION ALL
SELECT id, 'Health', true FROM finance_categories WHERE name = 'Daily Life' UNION ALL
SELECT id, 'Personal Care', true FROM finance_categories WHERE name = 'Daily Life' UNION ALL
SELECT id, 'Clothing & Footwear', true FROM finance_categories WHERE name = 'Daily Life' UNION ALL
SELECT id, 'Miscellaneous', true FROM finance_categories WHERE name = 'Daily Life'
ON CONFLICT DO NOTHING;

-- Transport
INSERT INTO finance_subcategories (category_id, name, is_system)
SELECT id, 'Public Transport', true FROM finance_categories WHERE name = 'Transport & Vehicle' UNION ALL
SELECT id, 'My Vehicle', true FROM finance_categories WHERE name = 'Transport & Vehicle'
ON CONFLICT DO NOTHING;

-- Entertainment
INSERT INTO finance_subcategories (category_id, name, is_system)
SELECT id, 'Social & Outings', true FROM finance_categories WHERE name = 'Entertainment & Development' UNION ALL
SELECT id, 'Digital Leisure', true FROM finance_categories WHERE name = 'Entertainment & Development' UNION ALL
SELECT id, 'Travel & Vacations', true FROM finance_categories WHERE name = 'Entertainment & Development' UNION ALL
SELECT id, 'Education', true FROM finance_categories WHERE name = 'Entertainment & Development'
ON CONFLICT DO NOTHING;

-- Financial
INSERT INTO finance_subcategories (category_id, name, is_system)
SELECT id, 'Investments & Returns', true FROM finance_categories WHERE name = 'Financial' UNION ALL
SELECT id, 'Fees & Commissions', true FROM finance_categories WHERE name = 'Financial' UNION ALL
SELECT id, 'Loans', true FROM finance_categories WHERE name = 'Financial'
ON CONFLICT DO NOTHING;

-- Maple
INSERT INTO finance_subcategories (category_id, name, is_system)
SELECT id, 'Items / Cubes', true FROM finance_categories WHERE name = 'Maple' UNION ALL
SELECT id, 'Mesos', true FROM finance_categories WHERE name = 'Maple' UNION ALL
SELECT id, 'Operating Expenses', true FROM finance_categories WHERE name = 'Maple' UNION ALL
SELECT id, 'Powerleveling', true FROM finance_categories WHERE name = 'Maple'
ON CONFLICT DO NOTHING;

-- Work
INSERT INTO finance_subcategories (category_id, name, is_system)
SELECT id, 'Salaries & Fees', true FROM finance_categories WHERE name = 'Work' UNION ALL
SELECT id, 'Other Work Income', true FROM finance_categories WHERE name = 'Work'
ON CONFLICT DO NOTHING;
