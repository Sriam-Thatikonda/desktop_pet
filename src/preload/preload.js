const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore, options) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, options);
  },
  onCursorPosition: (callback) => {
    const handler = (event, pos) => callback(pos);
    ipcRenderer.on('cursor-position', handler);
    return () => ipcRenderer.removeListener('cursor-position', handler);
  },
  getScreenInfo: () => ipcRenderer.invoke('get-screen-info'),
  exitApp: () => ipcRenderer.send('exit-app'),
  openContextMenu: (options) => ipcRenderer.send('open-context-menu', options),
  notifyMenuOpened: () => ipcRenderer.send('menu-opened'),
  notifyMenuClosed: () => ipcRenderer.send('menu-closed'),
  onMenuClosed: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu-closed', handler);
    return () => ipcRenderer.removeListener('menu-closed', handler);
  },
  onMenuCommand: (callback) => {
    const handler = (event, command) => callback(command);
    ipcRenderer.on('menu-command', handler);
    return () => ipcRenderer.removeListener('menu-command', handler);
  },
  getAppDir: () => ipcRenderer.invoke('get-app-dir')
});
