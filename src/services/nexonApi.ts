interface NexonRankEntry {
    characterName: string;
    level: number;
    exp: number;
    jobName: string;
    worldID: number;
    rank: number;
    characterImgURL: string;
}

export interface NexonCharacterData {
    level: number;
    exp: number;
    jobName: string;
    avatarUrl: string;
}

export const nexonApi = {
    async fetchCharacter(characterName: string): Promise<NexonCharacterData | null> {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const url = `${supabaseUrl}/functions/v1/nexon-proxy?character_name=${encodeURIComponent(characterName)}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${anonKey}` }
        });

        if (!response.ok) {
            const text = await response.text().catch(() => response.status.toString());
            throw new Error(`Edge Function error ${response.status}: ${text}`);
        }

        const data = await response.json();
        const top: NexonRankEntry[] = data?.ranks || data?.rankingtop || [];
        if (top.length === 0) return null;

        const entry = top.find(e => e.characterName.toLowerCase() === characterName.toLowerCase()) || top[0];

        return {
            level: entry.level,
            exp: entry.exp,
            jobName: entry.jobName,
            avatarUrl: entry.characterImgURL
        };
    }
};
