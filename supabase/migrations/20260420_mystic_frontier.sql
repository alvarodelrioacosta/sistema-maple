-- Add per-character Mystic Frontier unlock flag
ALTER TABLE characters ADD COLUMN is_mystic_frontier_unlocked BOOLEAN DEFAULT FALSE;

-- Track expedition state (3 per character)
CREATE TABLE character_mystic_frontier_expeditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  expedition_index INTEGER NOT NULL CHECK (expedition_index BETWEEN 1 AND 3),
  site_rank TEXT NOT NULL DEFAULT 'Common'
    CHECK (site_rank IN ('Common','Rare','Epic','Unique','Legendary')),
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','exploring','resting')),
  exploration_started_at TIMESTAMPTZ,
  rest_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(character_id, expedition_index)
);

-- Track reward history per expedition completion
CREATE TABLE mystic_frontier_reward_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  expedition_index INTEGER NOT NULL CHECK (expedition_index BETWEEN 1 AND 3),
  site_rank TEXT NOT NULL,
  rewards JSONB NOT NULL DEFAULT '[]',
  collected_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE character_mystic_frontier_expeditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mystic_frontier_reward_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_expeditions ON character_mystic_frontier_expeditions
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY admin_all_rewards ON mystic_frontier_reward_history
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');
