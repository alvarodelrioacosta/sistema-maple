import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  const url = new URL(req.url);
  const characterName = url.searchParams.get('character_name');

  if (!characterName) {
    return new Response(JSON.stringify({ error: 'character_name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const encoded = encodeURIComponent(characterName);
  const BASE = 'https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na';
  const fetchHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://www.nexon.com/microsite/maplestory/rank'
  };

  const urls = [
    `${BASE}?type=overall&id=weekly&reboot_index=0&page_index=1&character_name=${encoded}`,
    `${BASE}?type=overall&id=overall&reboot_index=0&page_index=1&character_name=${encoded}`,
  ];

  try {
    for (const nexonUrl of urls) {
      const response = await fetch(nexonUrl, { headers: fetchHeaders });
      if (!response.ok) continue;
      const data = await response.json();
      // API returns either "ranks" or "rankingtop" depending on version
      const entries = data?.ranks || data?.rankingtop || [];
      if (entries.length > 0) {
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    return new Response(JSON.stringify({ ranks: [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch from Nexon', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
