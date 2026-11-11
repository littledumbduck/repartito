// Ruta en moto por calles entre dos puntos, con Valhalla (OpenStreetMap, sin clave).
// Solo se envían las coordenadas de origen y destino, una vez por pedido.
const { net, app } = require('electron');

// Decodifica una polilínea de Valhalla (precisión 6) → [[lat, lng], …]
function decode(str) {
  const pts = []; let i = 0, lat = 0, lng = 0;
  const next = () => {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(i++) - 63; result |= (b & 31) << shift; shift += 5; } while (b >= 32);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < str.length) { lat += next(); lng += next(); pts.push([lat / 1e6, lng / 1e6]); }
  return pts;
}

async function getRoute(from, to) {
  try {
    const url = new URL('https://valhalla1.openstreetmap.de/route');
    url.searchParams.set('json', JSON.stringify({
      locations: [{ lat: from.lat, lon: from.lng }, { lat: to.lat, lon: to.lng }],
      costing: 'motor_scooter',
    }));
    const res = await net.fetch(url.toString(), {
      headers: { 'User-Agent': `Repartito/${app.getVersion()} (+https://github.com/littledumbduck/repartito)` },
    });
    const j = await res.json();
    const shape = j.trip?.legs?.[0]?.shape;
    if (!shape) return null;
    return { points: decode(shape), seconds: j.trip.summary.time };
  } catch { return null; }
}

// Punto a la fracción p (0–1) de la longitud total de la ruta.
function pointAt(points, p) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], (points[i][1] - points[i - 1][1]) * Math.cos((points[i][0] * Math.PI) / 180));
    seg.push(d); total += d;
  }
  let target = total * p;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) {
      const t = seg[i] ? Math.min(1, target / seg[i]) : 0;
      return { lat: points[i][0] + (points[i + 1][0] - points[i][0]) * t, lng: points[i][1] + (points[i + 1][1] - points[i][1]) * t };
    }
    target -= seg[i];
  }
  return { lat: points[0][0], lng: points[0][1] };
}

module.exports = { getRoute, pointAt };
