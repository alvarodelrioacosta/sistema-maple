-- Rename 'PSOKED' to 'Tradeable Once' in items table
UPDATE public.items 
SET tradeability = 'Tradeable Once' 
WHERE tradeability = 'PSOKED';

-- Verify update
SELECT count(*) as tradeable_once_count FROM public.items WHERE tradeability = 'Tradeable Once';
