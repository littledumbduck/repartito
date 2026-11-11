const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('repartito', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  onStatus: (cb) => ipcRenderer.on('status', (_e, s) => cb(s)),
  openMap: () => ipcRenderer.send('open-map'),
  setIgnore: (v) => ipcRenderer.send('set-ignore', v),
  welcomeLogin: () => ipcRenderer.send('welcome-login'),
  welcomeDemo: () => ipcRenderer.send('welcome-demo'),
  welcomeDone: (openAtLogin) => ipcRenderer.send('welcome-done', openAtLogin),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragMove: (dx, dy) => ipcRenderer.send('drag-move', dx, dy),
  dragEnd: () => ipcRenderer.send('drag-end'),
  getHistory: () => ipcRenderer.invoke('get-history'),
  openHistory: () => ipcRenderer.send('open-history'),
  getSummary: () => ipcRenderer.invoke('get-summary'),
  hover: (v) => ipcRenderer.send('hover', v),
  onWalk: (cb) => ipcRenderer.on('walk', (_e, d) => cb(d)),
  showMenu: () => ipcRenderer.send('show-menu'),
});
