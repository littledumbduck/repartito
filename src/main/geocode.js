// Convierte una dirección en coordenadas con Nominatim (OpenStreetMap).
// Solo se envía el texto de la dirección, una vez por dirección y sin guardarlo en disco.
// Política de uso: https://operations.osmfoundation.org/policies/nominatim/ (máx. 1 petición/s).
const { net, app } = require('electron');

const cache = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(q, near) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', q);
  if (near) { // sesga la búsqueda a ~15 km alrededor de un punto conocido (la ciudad del pedido)
    const d = 0.15;
    url.searchParams.set('viewbox', [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(','));
    url.searchParams.set('bounded', '1');
  }
  const res = await net.fetch(url.toString(), {
    headers: { 'User-Agent': `Repartito/${app.getVersion()} (+https://github.com/littledumbduck/repartito)` },
  });
  const json = await res.json();
  return json[0] ? { lat: +json[0].lat, lng: +json[0].lon } : null;
}

// Si la dirección completa no se encuentra (piso, puerta…), se van quitando partes del final.
async function geocode(address, near) {
  if (!address) return null;
  const key = address + '|' + (near ? 'n' : '');
  if (cache.has(key)) return cache.get(key);
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  let found = null;
  for (let n = parts.length; n >= 1 && !found; n--) {
    try { found = await search(parts.slice(0, n).join(', '), near); } catch { break; }
    await sleep(1100);
  }
  cache.set(key, found);
  return found;
}

module.exports = { geocode };
