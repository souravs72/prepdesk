const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('prepdesk', {
  isElectron: true,
  shell: 'electron',
})
