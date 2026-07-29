const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('prepilo', {
  isElectron: true,
  shell: 'electron',
})
