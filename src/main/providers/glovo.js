// Proveedor Glovo (NO OFICIAL, basado en la web).
//
// No guardamos usuario ni contraseña: el usuario inicia sesión en la web oficial dentro de una
// ventana de la app (partición persistente, con captcha/2FA incluidos). Después una ventana oculta
// abre la página del pedido del propio usuario y lee el texto que ya se muestra en pantalla.
//
// Limitación real: la web de Glovo solo muestra la ventana de "Llegada estimada" (p. ej. 20:05 - 20:25)
// y un mapa estático. La posición del repartidor y las fases solo existen en la app móvil, así que
// este proveedor NO puede ofrecerlas. Si Glovo cambia su web, ajusta los textos de abajo.
const { BrowserWindow, app } = require('electron');
const fs = require('fs');
const path = require('path');
const { geocode } = require('../geocode');
const { getRoute, pointAt } = require('../route');

const PARTITION = 'persist:glovo';
const HOME_URL = 'https://glovoapp.com/es/es/';
const ORDERS_URL = 'https://glovoapp.com/es/profile/past-orders';
const POLL_ACTIVE_MS = 8000;
const POLL_IDLE_MS = 30000;

function openLogin() {
  const win = new BrowserWindow({
    width: 480, height: 760, title: 'Inicia sesión (web oficial)', autoHideMenuBar: true,
    webPreferences: { partition: PARTITION, contextIsolation: true, sandbox: true },
  });
  win.loadURL(HOME_URL);
  return win;
}

async function logout() {
  const { session } = require('electron');
  await session.fromPartition(PARTITION).clearStorageData();
}

const hhmm = (h, m) => { const d = new Date(); d.setHours(+h, +m, 0, 0); return d.getTime(); };
const fmt = (t) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

// ---- seguimiento del pedido para el resumen final (se guarda en disco por si se reinicia la app) ----
const tripFile = () => path.join(app.getPath('userData'), 'trip.json');
const loadTrip = () => { try { return JSON.parse(fs.readFileSync(tripFile(), 'utf8')); } catch { return null; } };
const saveTrip = (t) => { try { fs.writeFileSync(tripFile(), JSON.stringify(t)); } catch {} };
const clearTrip = () => { try { fs.unlinkSync(tripFile()); } catch {} };

const dur = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "Entregado 07 Nov, 2026 | 11:52" → timestamp (hora de entrega según Glovo)
function parseDeliveredAt(text) {
  const m = /Entregado\s+(\d{1,2})\s+([A-Za-zñÑ]{3})\w*\.?,?\s+(\d{4})\s*\|\s*(\d{1,2}):(\d{2})/i.exec(text);
  const mo = m && MONTHS.indexOf(m[2].toLowerCase());
  return m && mo >= 0 ? new Date(+m[3], mo, +m[1], +m[4], +m[5]).getTime() : null;
}

// Solo usa lo que Repartito ha visto: Glovo no da la hora del pedido ni cuándo se termina de cocinar.
function buildSummary(t, end) {
  if (!t) return null;
  const lines = [t.partial
    ? `⏱️ Repartito lo siguió ${dur(end - t.firstSeen)} (de ${fmt(t.firstSeen)} a ${fmt(end)})`
    : `⏱️ Tiempo total: ${dur(end - t.firstSeen)} (de ${fmt(t.firstSeen)} a ${fmt(end)})`];
  if (t.partial) lines.push(`ℹ️ Repartito empezó a seguir el pedido a las ${fmt(t.firstSeen)} (ya con repartidor): lo anterior no se conoce. Deja Repartito abierto al pedir para medirlo entero.`);
  else if (t.assigned) lines.push(`👤 Hasta que se asignó repartidor: ${dur(t.assigned - t.firstSeen)}`);
  if (t.pickedUp) {
    if (t.assigned) lines.push(`🍳 Con repartidor asignado hasta recoger el pedido: ${dur(t.pickedUp - t.assigned)} (incluye cocinado y espera)`);
    lines.push(`🛵 En ruta hasta tu puerta: ${dur(end - t.pickedUp)}`);
  }
  if (t.almost) lines.push(`🔔 Desde el aviso "ya casi está aquí": ${dur(end - t.almost)}`);
  let verdict = '';
  if (t.firstEta) {
    const late = Math.round((end - t.firstEta.to) / 60000);
    const early = Math.round((t.firstEta.from - end) / 60000);
    verdict = late > 0 ? `${late} min después de lo prometido` : early > 0 ? `${early} min antes de lo prometido` : 'dentro de lo prometido';
    lines.push(`📅 Glovo prometió entre las ${fmt(t.firstEta.from)} y las ${fmt(t.firstEta.to)}: llegó ${verdict}.`);
  }
  const head = t.partial ? `Entregado a las ${fmt(end)}` : `Tardó ${dur(end - t.firstSeen)}`;
  return { id: t.id, store: t.store || null, endedAt: end, lines, oneLine: `${head}${verdict ? ' · ' + verdict : ''}` };
}

// Texto de la página de detalle → estado (o null si no hay pedido activo).
// Dos formatos: franja horaria ("20:05 - 20:25") antes de asignar repartidor y "Quedan 15 minutos" después.
function parseDetail(text) {
  // Solo la cabecera (antes de "Tu pedido"): "Llegada estimada · Quedan N minutos" o
  // "¡Se está entregando tu pedido! · Quedan N minutos".
  const head = text.split(/^\s*Tu pedido\s*$|Detalles de la entrega/m)[0];
  if (/ya casi está aquí/i.test(head)) return { remainingMin: 1, courierAssigned: true, delivering: true, almost: true };
  const q = /Que(?:dan|da)\s+(\d+)\s*min/i.exec(head);
  if (q) return { remainingMin: +q[1], courierAssigned: true, delivering: /se está entregando/i.test(head) };
  const m =/Llegada estimada\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/i.exec(text);
  if (!m) return null;
  const from = hhmm(m[1], m[2]);
  let to = hhmm(m[3], m[4]);
  if (to < from) to += 86400000; // cruza medianoche
  return { from, to };
}

const MOTO_KMH = 20; // velocidad media urbana supuesta de una moto

function distKm(a, b) {
  const r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Posición ESTIMADA (Glovo no la comparte): el repartidor sale del restaurante cuando el tiempo que
// falta hasta la hora media de llegada iguala lo que tardaría la moto, y avanza en línea recta.
function estimateCourier(places, arriveAt, now) {
  const { store, destination: home, route } = places || {};
  if (!store || !home) return null;
  // Con ruta por calles, el tiempo de viaje sale de la ruta; si no, línea recta a velocidad supuesta.
  const travelMs = route ? route.seconds * 1000 : (distKm(store, home) / MOTO_KMH) * 3600000;
  const p = Math.min(1, Math.max(0, 1 - (arriveAt - now) / Math.max(travelMs, 60000)));
  if (route) return pointAt(route.points, p);
  return { lat: store.lat + (home.lat - store.lat) * p, lng: store.lng + (home.lng - store.lng) * p };
}

// Tras "Detalles de la entrega" la página lista: dirección del restaurante y dirección de entrega.
function parseAddresses(text) {
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
  const i = lines.findIndex((l) => /^Detalles de la entrega/i.test(l));
  return i < 0 ? [] : lines.slice(i + 1, i + 3);
}

// Solo para desarrollo (REPARTITO_WATCH=1): anota los cambios de la cabecera de la página del pedido
// (estado y hora, nunca direcciones ni productos) para ver qué texto muestra Glovo en cada fase.
let lastHead = '';
function watchLog(href, text) {
  if (!process.env.REPARTITO_WATCH) return;
  const head = text.split(/^\s*Tu pedido\s*$|Detalles de la entrega/m)[0].replace(/\s+/g, ' ').trim().slice(0, 300);
  if (head === lastHead) return;
  lastHead = head;
  const file = require('path').join(require('electron').app.getPath('userData'), 'watch.log');
  require('fs').appendFileSync(file, `${new Date().toLocaleTimeString('es-ES')} ${href.replace(/\d{6,}/, '#')} | ${head}\n`);
}

function start(emit, { geocode: useGeocode = true } = {}) {
  const win = new BrowserWindow({
    show: false, width: 1000, height: 800,
    webPreferences: { partition: PARTITION, contextIsolation: true, sandbox: true },
  });
  const wc = win.webContents;
  let wasActive = false, stopped = false, busy = false, places = null, misses = 0, activeUrl = null, trip = null;

  const read = (js) => wc.executeJavaScript(js, true);
  const settle = (ms) => new Promise((r) => setTimeout(r, ms));

  async function poll() {
    if (stopped || busy) return;
    busy = true;
    try {
      let win_ = null, pageText = '';
      // Con el pedido ya localizado se lee solo su página (más rápido → lecturas más seguidas).
      if (activeUrl) {
        await win.loadURL(activeUrl);
        await settle(2000);
        pageText = await read('document.body.innerText');
        win_ = parseDetail(pageText);
        watchLog(activeUrl, pageText);
        if (!win_) {
          // Un pedido terminado muestra "Entregado <fecha> | <hora> · ID DE PEDIDO: <id>".
          const id = activeUrl.match(/\d{6,}/)?.[0];
          if (id && pageText.includes(id) && /Entregado\s+\d{1,2}\s/i.test(pageText)) { activeUrl = null; return finish(parseDeliveredAt(pageText)); }
          activeUrl = null; // si no, se vuelve a mirar la lista completa
        }
      }
      if (!win_) {
        await win.loadURL(ORDERS_URL);
        await settle(2500);
        // Los 3 pedidos más recientes; el activo enlaza a /order-tracking/<id>, los terminados a /past-orders/<id>.
        const hrefs = await read(`[...new Set([...document.querySelectorAll('a[href*="/order-tracking/"], a[href*="/past-orders/"]')].map(a => a.getAttribute('href')))]
          .filter(h => /\\/(order-tracking|past-orders)\\/\\d+/.test(h))
          .sort((a, b) => (b.includes('order-tracking') ? 1 : 0) - (a.includes('order-tracking') ? 1 : 0)).slice(0, 3)`);
        if (!hrefs.length) {
          const logged = await read(`!document.body.innerText.includes('Iniciar sesión')`);
          if (!logged) return emit({ state: 'error', text: 'Inicia sesión en Glovo desde el menú 🔑' });
          return miss();
        }
        for (const href of hrefs) {
          const url = new URL(href, ORDERS_URL).toString();
          await win.loadURL(url);
          await settle(2500);
          pageText = await read('document.body.innerText');
          win_ = parseDetail(pageText);
          watchLog(href, pageText);
          if (win_) { activeUrl = url; break; }
        }
      }
      if (!win_) return miss();
      wasActive = true;
      if (useGeocode && !places) {
        const [storeAddr, homeAddr] = parseAddresses(pageText);
        const store = await geocode(storeAddr);
        const home = await geocode(homeAddr, store);
        const route = store && home ? await getRoute(store, home) : null;
        places = { store: store && { ...store, name: 'Restaurante' }, destination: home, route };
      }
      misses = 0;
      const now = Date.now();
      const orderId = activeUrl?.match(/\d{6,}/)?.[0];
      if (!trip || trip.id !== orderId) {
        trip = loadTrip();
        if (!trip || trip.id !== orderId) {
          trip = { id: orderId, firstSeen: now, firstEta: win_.from ? { from: win_.from, to: win_.to } : null,
            partial: win_.remainingMin !== undefined, assigned: null, pickedUp: null, almost: null };
        }
      }
      if (!trip.store) trip.store = /\d+\s+productos?\s+de\s+([^\n]+)/i.exec(pageText)?.[1]?.trim() || null;
      if (win_.remainingMin !== undefined && !trip.assigned) trip.assigned = trip.partial ? trip.firstSeen : now;
      if (win_.delivering && !trip.pickedUp) trip.pickedUp = now;
      if (win_.almost && !trip.almost) trip.almost = now;
      saveTrip(trip);
      let state, text, etaMin, arriveAt;
      if (win_.remainingMin !== undefined) { // ya hay repartidor: Glovo da los minutos que quedan
        arriveAt = now + win_.remainingMin * 60000;
        etaMin = win_.remainingMin;
        state = etaMin <= 3 || win_.delivering ? 'arriving' : 'delivering';
        if (win_.almost) etaMin = null; // Glovo ya no da minutos
        text = win_.almost ? '¡Tu pedido ya casi está aquí! Prepárate 🔔'
          : win_.delivering ? '¡Se está entregando tu pedido! Ve preparándote 🔔'
          : state === 'arriving' ? '¡Casi llega! Baja a la puerta 🔔' : 'Tu repartidor ya está en camino 🛵';
      } else {
        arriveAt = (win_.from + win_.to) / 2;
        const inWindow = now >= win_.from;
        etaMin = inWindow ? null : Math.max(1, Math.round((arriveAt - now) / 60000));
        state = inWindow ? 'arriving' : 'delivering';
        text = inWindow
          ? `Llega en cualquier momento (hasta las ${fmt(win_.to)}) 🔔`
          : `Tu pedido llega entre las ${fmt(win_.from)} y las ${fmt(win_.to)} 🛵`;
      }
      emit({
        state, text, etaMin,
        courier: estimateCourier(places, arriveAt, now),
        courierEstimated: true,
        route: places?.route?.points || null,
        store: places?.store || null, destination: places?.destination || null,
        note: 'Posición estimada del repartidor: Glovo solo la comparte en su app móvil.', updatedAt: now,
      });
    } catch { /* red caída o página cambiada: se reintenta en el siguiente ciclo */ } finally { busy = false; }
  }
  // Una lectura fallida (página a medio cargar, cambio de formato…) no basta para decir "Entregado".
  function miss() {
    if (!wasActive) return finish();
    misses ||= Date.now(); // desde cuándo no vemos el pedido
    if (Date.now() - misses >= 75000) finish(misses);
  }
  const delay = () => (wasActive ? POLL_ACTIVE_MS : POLL_IDLE_MS);
  function finish(deliveredAt) {
    places = null; // el siguiente pedido tendrá otras direcciones
    if (wasActive) {
      wasActive = false;
      const summary = buildSummary(trip, deliveredAt || Date.now());
      trip = null; clearTrip();
      emit({ state: 'delivered', text: '¡Entregado! Que aproveche 😋', summary, updatedAt: Date.now() });
    }
    else emit({ state: 'idle', text: 'Sin pedidos activos 💤' });
  }

  // Con pedido en marcha se lee cada ~10 s; sin pedido, cada 30 s.
  let timer;
  const loop = async () => { await poll(); if (!stopped) timer = setTimeout(loop, delay()); };
  loop();
  return () => { stopped = true; clearTimeout(timer); win.destroy(); };
}

module.exports = { start, openLogin, logout, buildSummary };
