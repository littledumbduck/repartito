const map = L.map('map').setView([40.4168, -3.7038], 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const emoji = (e) => L.divIcon({ html: `<div style="font-size:28px;line-height:28px">${e}</div>`, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
const markers = {};
let fitted = false, routeLine = null;

function put(key, pos, icon, label) {
  if (!pos) return;
  if (!markers[key]) markers[key] = L.marker([pos.lat, pos.lng], { icon: emoji(icon), title: label }).addTo(map);
  else markers[key].setLatLng([pos.lat, pos.lng]);
}

function render(s) {
  const bar = document.getElementById('bar');
  bar.textContent = s.text + (s.etaMin ? `  ·  ~${s.etaMin} min` : '');
  if (s.note) { const n = document.createElement('div'); n.textContent = s.note; n.style.cssText = 'font-size:12px;color:#666;margin-top:3px'; bar.appendChild(n); }
  put('store', s.store, '🏪', 'Restaurante');
  put('dest', s.destination, '🏠', 'Tu casa');
  if (s.route && !routeLine) routeLine = L.polyline(s.route, { color: '#2b7de9', weight: 4, opacity: 0.6, dashArray: '8 8' }).addTo(map);
  if (!s.route && routeLine) { routeLine.remove(); routeLine = null; }
  put('courier', s.courier, '🛵', s.courierEstimated ? 'Repartidor (posición estimada)' : 'Repartidor');
  if (!s.courier && markers.courier) { markers.courier.remove(); delete markers.courier; }
  const pts = Object.values(markers).map((m) => m.getLatLng());
  if (pts.length && !fitted) { map.fitBounds(L.latLngBounds(pts).pad(0.3)); fitted = true; }
}
window.repartito.getStatus().then(render);
window.repartito.onStatus(render);
