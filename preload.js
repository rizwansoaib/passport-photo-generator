// Preload script for Electron
// This script runs before the web page loads and can safely expose
// limited APIs to the renderer process

const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// specific features without exposing the entire electron API
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true
});

// Log that we're running in Electron
console.log('Running in Electron environment');
