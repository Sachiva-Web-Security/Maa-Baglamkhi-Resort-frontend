// Electron main process — Maa Baglamkhi Resort standalone desktop app
//
// Launches with `npm run electron:start` (or the packaged .exe).
// Serves the built frontend (dist/) and talks to the backend via
// VITE_API_BASE (default http://localhost:5002/api).

const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

const DEV_MODE = process.env.NODE_ENV === "development";
const DEV_URL = process.env.VITE_DEV_URL || "http://localhost:5173";
const BACKEND_URL =
  process.env.VITE_API_BASE ||
  process.env.VITE_BACKEND_ORIGIN ||
  "http://localhost:5002";

// The prebuilt frontend lives at dist/ next to electron-main.js.
const DIST_DIR = path.join(__dirname, "dist");
const DIST_INDEX = path.join(DIST_DIR, "index.html");

function hasDist() {
  return fs.existsSync(DIST_INDEX);
}

createWindow = null; // placeholder

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "electron-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow the renderer to reach the local backend over http
      webSecurity: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  // Open external links in the default browser, not in-app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  if (DEV_MODE && !process.env.VITE_DIST) {
    win.loadURL(DEV_URL);
  } else if (hasDist()) {
    win.loadFile(DIST_INDEX);
  } else {
    // No build yet — fall back to dev server
    win.loadURL(DEV_URL);
  }

  // Expose backend URL so the renderer's axios client knows where to call
  win.webContents.on("did-finish-load", () => {
    win.webContents.executeJavaScript(
      `window.__BACKEND_URL__ = ${JSON.stringify(BACKEND_URL)}`
    );
  });

  return win;
}

app.whenReady().then(() => {
  // Minimal menu — no dev tools by default in production
  if (DEV_MODE) {
    Menu.setApplicationMenu(null); // keep the default menu with devtools
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
