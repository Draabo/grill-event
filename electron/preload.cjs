const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  loadEvents: () => ipcRenderer.invoke('load-events'),
  saveEvents: (data) => ipcRenderer.invoke('save-events', data),
})
