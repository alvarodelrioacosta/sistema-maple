
async function checkApi() {
    const name = "Arcane Umbra Knight Hat";
    const url = `https://maplestory.io/api/gms/253/item?searchFor=${encodeURIComponent(name)}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.statusText);
        const json = await res.json();
        console.log('Result count:', json.length);
        if (json.length > 0) {
            console.log('First item:', json[0]);
            console.log('Image URL:', `https://maplestory.io/api/gms/253/item/${json[0].id}/icon`);
        }
    } catch (e) {
        console.error('API Error:', e);
    }
}
checkApi();
