/**
 * TeamForge IDE — Electron Preload Script
 *
 * Provides safe IPC bridge between renderer and main process.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('teamforge', {
  // Platform info
  platform: process.platform,
  isElectron: true,
  version: require('../package.json').version,

  // Menu actions
  onMenuAction: (channel, callback) => {
    const validChannels = [
      'menu-new-file', 'menu-open-file', 'menu-save', 'menu-save-all',
      'menu-settings', 'menu-find', 'menu-replace', 'menu-terminal',
      'menu-clear-terminal',
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },

  // App control
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
})
