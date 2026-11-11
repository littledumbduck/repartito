const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, screen, nativeImage, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const demo = require('./providers/demo');
const glovo = require('./providers/glovo');

if (!app.requestSingleInstanceLock()) app.quit();

const cfgFile = () => path.join(app.getPath('userData'), 'config.json');
const loadCfg = () => { try { return JSON.parse(fs.readFileSync(cfgFile(), 'utf8')); } catch { return {}; } };
const saveCfg = () => fs.writeFileSync(cfgFile(), JSON.stringify(cfg));
let cfg = {};

let pet, mapWin, tray, stopProvider = null;
let status = { state: 'idle', text: 'Sin pedidos activos 💤' };

function createPet() {
  const { workArea } = screen.getPrimaryDisplay();
  const w = 300, h = 240;
  pet = new BrowserWindow({
    width: w, height: h, x: workArea.x + workArea.width - w - 8, y: workArea.y + workArea.height - h - 8,
    show: false, transparent: true, frame: false, resizable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, sandbox: true },
  });
  pet.setAlwaysOnTop(true, 'screen-saver');
  // Los juegos en ventana sin bordes también se ponen "siempre encima": reclamamos el primer plano.
  setInterval(() => {
    if (pet && !pet.isDestroyed() && pet.isVisible()) { pet.setAlwaysOnTop(true, 'screen-saver'); pet.moveTop(); }
  }, 2000);
  pet.loadFile(path.join(__dirname, '..', 'renderer', 'pet.html'));
  pet.setIgnoreMouseEvents(true, { forward: true });
}

function openMap() {
  if (mapWin && !mapWin.isDestroyed()) { mapWin.show(); mapWin.focus(); return; }
  mapWin = new BrowserWindow({
    width: 760, height: 560, title: 'Repartito — Mapa', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, sandbox: true },
  });
  mapWin.loadFile(path.join(__dirname, '..', 'renderer', 'map.html'));
}

// ---- historial de pedidos (solo en tu equipo, máx. 100) ----
const histFile = () => path.join(app.getPath('userData'), 'history.json');
function loadHistory() { try { return JSON.parse(fs.readFileSync(histFile(), 'utf8')); } catch { return []; } }
function addHistory(summary) {
  const list = loadHistory().filter((h) => !summary.id || h.id !== summary.id);
  fs.writeFileSync(histFile(), JSON.stringify([summary, ...list].slice(0, 100)));
}
function clearHistory() { try { fs.unlinkSync(histFile()); } catch {} }

let historyWin;
function openHistory() {
  if (historyWin && !historyWin.isDestroyed()) { historyWin.show(); historyWin.focus(); return; }
  historyWin = new BrowserWindow({
    width: 560, height: 640, title: 'Historial de pedidos', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, sandbox: true },
  });
  historyWin.loadFile(path.join(__dirname, '..', 'renderer', 'history.html'));
}

let summaryWin;
function openSummary() {
  if (summaryWin && !summaryWin.isDestroyed()) { summaryWin.show(); summaryWin.focus(); return; }
  summaryWin = new BrowserWindow({
    width: 480, height: 560, title: 'Resumen de tu pedido', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, sandbox: true },
  });
  summaryWin.loadFile(path.join(__dirname, '..', 'renderer', 'summary.html'));
}

const broadcast =() => [pet, mapWin].forEach((w) => w && !w.isDestroyed() && w.webContents.send('status', status));

// ---- paseo de la mascota por la parte baja de la pantalla ----
let dragging = false;
let wander = null, targetX = null, pauseUntil = 0, hovering = false, lastDir = 0, hideTimer = null;
function walk(dir) {
  if (dir !== lastDir && pet && !pet.isDestroyed()) { lastDir = dir; pet.webContents.send('walk', dir); }
}
function step() {
  if (!pet || pet.isDestroyed()) return;
  const now = Date.now();
  if (hovering || dragging || cfg.wander === false || now < pauseUntil) return walk(0);
  const a = screen.getPrimaryDisplay().workArea;
  const b = pet.getBounds();
  if (targetX === null || Math.abs(targetX - b.x) <= 3) {
    pauseUntil = now + 2500 + Math.random() * 4500;
    targetX = Math.round(a.x + Math.random() * (a.width - b.width));
    return walk(0);
  }
  const dir = Math.sign(targetX - b.x);
  walk(dir);
  pet.setBounds({ x: b.x + dir * 3, y: b.y, width: b.width, height: b.height });
}
function startWander() { if (!wander) wander = setInterval(step, 33); }
function stopWander() { clearInterval(wander); wander = null; walk(0); }

// El animalito solo existe mientras haya un pedido activo.
function syncPetVisibility(state) {
  clearTimeout(hideTimer);
  if (!pet || pet.isDestroyed()) return;
  if (state === 'idle' || state === 'error') { stopWander(); pet.hide(); return; }
  if (!pet.isVisible()) pet.showInactive();
  if (state === 'delivered' || state === 'cancelled') {
    stopWander();
    hideTimer = setTimeout(() => { pet.hide(); }, 120000); // celebra 2 min (da tiempo a ver el resumen) y se despide
  } else startWander();
}

function onStatus(next) {
  const changed = next.state !== status.state;
  status = next;
  if (next.summary && !next.summary.demo) addHistory(next.summary);
  broadcast();
  if (changed) syncPetVisibility(next.state);
  if (changed && cfg.notify !== false && Notification.isSupported() && next.state !== 'idle') {
    const body = next.summary ? `${next.text} ${next.summary.oneLine}. Toca el zorrito para ver el resumen.` : next.text;
    new Notification({ title: 'Repartito', body }).show();
  }
}

function stop() { if (stopProvider) stopProvider(); stopProvider = null; }
function startProvider(kind) {
  stop();
  if (kind === 'demo') stopProvider = demo.start(onStatus);
  if (kind === 'glovo') stopProvider = glovo.start(onStatus, { geocode: cfg.geocode !== false });
  cfg.provider = kind; saveCfg();
}

// Inicio de sesión: se abre la web oficial; al cerrarla, Repartito empieza a vigilar tus pedidos solo.
function loginFlow() {
  const w = glovo.openLogin();
  w.on('closed', () => startProvider('glovo'));
}

let welcomeWin;
function openWelcome() {
  if (welcomeWin && !welcomeWin.isDestroyed()) { welcomeWin.show(); welcomeWin.focus(); return; }
  welcomeWin = new BrowserWindow({
    width: 520, height: 640, title: 'Bienvenido a Repartito', autoHideMenuBar: true, resizable: false,
    webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, sandbox: true },
  });
  welcomeWin.loadFile(path.join(__dirname, '..', 'renderer', 'welcome.html'));
}
function idle() { stop(); onStatus({ state: 'idle', text: 'Sin pedidos activos 💤' }); cfg.provider = null; saveCfg(); }

function buildMenu() {
  return Menu.buildFromTemplate([
    { label: 'Ayuda y bienvenida', click: openWelcome },
    { label: 'Ver mapa', click: openMap },
    { label: 'Ver el resumen del último pedido', click: openSummary },
    { label: 'Historial de pedidos', click: openHistory },
    { type: 'separator' },
    { label: 'Iniciar sesión en Glovo…', click: loginFlow },
    { label: 'Cerrar sesión y borrar mis datos', click: async () => { idle(); clearHistory(); await glovo.logout(); } },
    { type: 'separator' },
    { label: 'Ver una demostración', click: () => startProvider('demo') },
    { label: 'Volver a vigilar mis pedidos', click: () => startProvider('glovo') },
    { label: 'Dejar de vigilar', click: idle },
    { type: 'separator' },
    { label: 'Dejar que el zorrito pasee por la pantalla', type: 'checkbox', checked: cfg.wander !== false, click: (i) => { cfg.wander = i.checked; saveCfg(); } },
    { label: 'Devolver el zorrito a su esquina', click: petHome },
    { label: 'Avisarme con notificaciones', type: 'checkbox', checked: cfg.notify !== false, click: (i) => { cfg.notify = i.checked; saveCfg(); } },
    { label: 'Mostrar restaurante y mi casa en el mapa', type: 'checkbox', checked: cfg.geocode !== false, click: (i) => { cfg.geocode = i.checked; saveCfg(); if (cfg.provider === 'glovo') startProvider('glovo'); } },
    { label: 'Abrir al encender el PC', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked }) },
    { label: 'Acerca de y aviso legal', click: () => shell.openExternal(require('../../package.json').homepage + '#aviso-legal') },
    { label: 'Salir de Repartito', click: () => app.quit() },
  ]);
}

app.whenReady().then(() => {
  cfg = loadCfg();
  createPet();
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '..', '..', 'assets', 'tray.png')));
  tray.setToolTip('Repartito');
  tray.setContextMenu(buildMenu());
  tray.on('click', openWelcome);
  if (!cfg.welcomed && !process.env.REPARTITO_GLOVO && !process.env.REPARTITO_DEMO) openWelcome();
  pet.webContents.on('did-finish-load', () => {
    broadcast();
    if (process.env.REPARTITO_DEMO) startProvider('demo');
    else if (process.env.REPARTITO_GLOVO) startProvider('glovo');
    else if (cfg.provider) startProvider(cfg.provider);
  });
});

ipcMain.handle('get-status', () => status);
// Con el pedido entregado, un clic en el zorrito abre el resumen y el zorrito se despide.
ipcMain.on('open-map', () => {
  if (status.state === 'delivered' && status.summary) {
    openSummary();
    clearTimeout(hideTimer); stopWander(); pet.hide();
  } else openMap();
});
ipcMain.handle('get-summary', () => status.summary || loadHistory()[0] || null);
ipcMain.handle('get-history', () => loadHistory());
ipcMain.on('open-history', openHistory);
ipcMain.on('set-ignore', (_e, ignore) => pet && pet.setIgnoreMouseEvents(ignore, { forward: true }));
// ---- arrastrar al zorrito: donde lo sueltes se queda quieto (hasta que reactives el paseo en el menú) ----
ipcMain.on('drag-start', () => { dragging = true; targetX = null; pet.setIgnoreMouseEvents(false); });
ipcMain.on('drag-move', (_e, dx, dy) => {
  if (!pet || pet.isDestroyed()) return;
  const b = pet.getBounds();
  const a = screen.getDisplayMatching(b).workArea;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  pet.setBounds({
    x: clamp(b.x + Math.round(dx), a.x, a.x + a.width - b.width),
    y: clamp(b.y + Math.round(dy), a.y, a.y + a.height - b.height),
    width: b.width, height: b.height,
  });
});
ipcMain.on('drag-end', () => { dragging = false; cfg.wander = false; saveCfg(); });
function petHome() {
  const { workArea } = screen.getPrimaryDisplay();
  const b = pet.getBounds();
  pet.setBounds({ x: workArea.x + workArea.width - b.width - 8, y: workArea.y + workArea.height - b.height - 8, width: b.width, height: b.height });
}
ipcMain.on('hover', (_e, v) => { hovering = !!v; });
ipcMain.on('show-menu', () => buildMenu().popup({ window: pet }));
ipcMain.on('welcome-login', loginFlow);
ipcMain.on('welcome-demo', () => startProvider('demo'));
ipcMain.on('welcome-done', (_e, openAtLogin) => {
  cfg.welcomed = true; saveCfg();
  app.setLoginItemSettings({ openAtLogin: !!openAtLogin });
  if (welcomeWin && !welcomeWin.isDestroyed()) welcomeWin.close();
});
app.on('second-instance', openWelcome); // si abren Repartito otra vez, mostramos la ayuda
app.on('window-all-closed', (e) => e.preventDefault()); // sigue en la bandeja
