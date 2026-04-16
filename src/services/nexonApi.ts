interface NexonRankEntry {
    characterName: string;
    level: number;
    exp: number;
    jobName: string;
    worldID: number;
    ranking: number;
    characterImgURL: string;
}

export interface NexonCharacterData {
    level: number;
    exp: number;
    jobName: string;
    world: string;
    rankPosition: number;
    avatarUrl: string;
}

const WORLD_NAMES: Record<number, string> = {
    0: 'Scania', 1: 'Bera', 2: 'Broa', 3: 'Windia', 5: 'Khaini',
    6: 'Bellocan', 7: 'Mardia', 8: 'Kradia', 9: 'Yellonde', 10: 'Galicia',
    12: 'El Nido', 13: 'Zenith', 14: 'Chaos', 15: 'Nova', 16: 'Renegades',
    17: 'Reboot', 18: 'Reboot 2', 45: 'Heroic'
};

export const nexonApi = {
    async fetchCharacter(characterName: string): Promise<NexonCharacterData | null> {
        try {
            const url = `https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na?type=overall&id=weekly&reboot_index=0&page_index=1&character_name=${encodeURIComponent(characterName)}`;
            const response = await fetch(url);
            if (!response.ok) return null;

            const data = await response.json();
            const top: NexonRankEntry[] = data?.rankingtop || [];
            if (top.length === 0) return null;

            const entry = top.find(e => e.characterName.toLowerCase() === characterName.toLowerCase()) || top[0];

            return {
                level: entry.level,
                exp: entry.exp,
                jobName: entry.jobName,
                world: WORLD_NAMES[entry.worldID] ?? `World ${entry.worldID}`,
                rankPosition: entry.ranking,
                avatarUrl: entry.characterImgURL
            };
        } catch {
            return null;
        }
    }
};
