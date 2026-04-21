export interface UnlockDef {
    key: string;
    label: string;
    group: string;
    category: 'boss' | 'system';
    level: 'character' | 'account';
    bossImageName?: string;
}

// Groups where items must be completed in order (each requires the previous)
export const SEQUENTIAL_UNLOCK_GROUPS = new Set(['MYSTIC FRONTIER']);

export const UNLOCK_DEFINITIONS: UnlockDef[] = [
    { key: 'unlock_cygnus',    label: 'Cygnus',          group: 'CYGNUS',          category: 'boss',   level: 'character', bossImageName: 'Cygnus' },
    { key: 'unlock_pink_bean', label: 'Pink Bean',       group: 'PINK BEAN',       category: 'boss',   level: 'character', bossImageName: 'Pink Bean' },
    { key: 'unlock_magnus',    label: 'Magnus',          group: 'MAGNUS',          category: 'boss',   level: 'character', bossImageName: 'Magnus' },
    { key: 'unlock_slime',     label: 'Slime',           group: 'SLIME',           category: 'boss',   level: 'character', bossImageName: 'Guardian Angel Slime' },
    { key: 'unlock_papulatus', label: 'Papulatus',       group: 'PAPULATUS',       category: 'boss',   level: 'character', bossImageName: 'Papulatus' },
    { key: 'unlock_6th_job',   label: '6th Job Prequest', group: '6TH JOB',        category: 'system', level: 'character' },
    { key: 'legion_artifact',  label: 'Legion Artifact', group: 'EXTRA STATS',     category: 'system', level: 'account' },
    { key: 'unlock_boss_pots', label: 'Boss Pots',       group: 'EXTRA STATS',     category: 'system', level: 'character' },
    { key: 'unlock_mf_8_fams', label: '8 Badge Fams',   group: 'MYSTIC FRONTIER', category: 'system', level: 'character' },
    { key: 'unlock_mf_9_fams', label: '9 Useful Fams',  group: 'MYSTIC FRONTIER', category: 'system', level: 'character' },
];
