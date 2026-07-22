-- Give workers full access to Mystic Frontier tables (start expeditions, claim rewards, etc.)
DROP POLICY IF EXISTS worker_select_expeditions ON character_mystic_frontier_expeditions;
DROP POLICY IF EXISTS worker_select_rewards ON mystic_frontier_reward_history;

CREATE POLICY worker_all_expeditions ON character_mystic_frontier_expeditions
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'worker'))
  WITH CHECK (get_my_role() IN ('admin', 'worker'));

CREATE POLICY worker_all_rewards ON mystic_frontier_reward_history
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'worker'))
  WITH CHECK (get_my_role() IN ('admin', 'worker'));
