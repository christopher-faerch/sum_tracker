const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tracker', {
  onPlayers: (cb) => ipcRenderer.on('players', (_e, players) => cb(players)),
  onGameTime: (cb) => ipcRenderer.on('game-time', (_e, time) => cb(time)),
  onHotkey: (cb) => ipcRenderer.on('hotkey', (_e, hotkey) => cb(hotkey)),
  dataDragon: () => ipcRenderer.invoke('data-dragon'),
  quit: () => ipcRenderer.send('quit'),
  resize: (height) => ipcRenderer.send('resize', height),
});
