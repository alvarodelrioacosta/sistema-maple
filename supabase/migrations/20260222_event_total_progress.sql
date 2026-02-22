-- =============================================
-- FUNCTION: get_event_total_progress
-- Returns total completed days per account for a specific event
-- =============================================

CREATE OR REPLACE FUNCTION get_event_total_progress(p_event_id UUID)
RETURNS TABLE (
    account_id UUID,
    total_completed BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        edp.account_id,
        COUNT(*)::BIGINT as total_completed
    FROM 
        event_daily_progress edp
    WHERE 
        edp.event_id = p_event_id
        AND edp.completed = true
    GROUP BY 
        edp.account_id;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_event_total_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_total_progress(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_event_total_progress(UUID) TO anon;
