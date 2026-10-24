// Preload script — runs in an isolated context between the main and renderer.
// Exposes a minimal API surface to the renderer without enabling nodeIntegration.

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  platform: process.platform,
});
