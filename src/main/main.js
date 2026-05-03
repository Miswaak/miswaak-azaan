const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { createLogger } = require("../services/logger");
const { createConfigStore } = require("../services/configStore");
const { getPrayerTimes } = require("../services/prayerService");
const { resolveLocationByCity, detectLocationByIp } = require("../services/locationService");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

let mainWindow;
let configStore;
let logger;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 680,
    minWidth: 760,
    minHeight: 560,
    title: "Miswaak Azaan",
    backgroundColor: "#f7f4ee",
    icon: path.join(app.getAppPath(), "assets", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

function getAzaanAudioUrl(prayerKey = "default") {
  const audioFile = prayerKey === "fajr" ? "default-azaan.ogg" : "rayhan-azaan.m4a";
  const audioPath = path.join(app.getAppPath(), "assets", audioFile);
  return pathToFileURL(audioPath).toString();
}

function registerIpc() {
  ipcMain.handle("app:getConfig", () => configStore.load());

  ipcMain.handle("app:saveConfig", (_event, nextConfig) => {
    const saved = configStore.save(nextConfig);
    return saved;
  });


  ipcMain.handle("app:resolveLocation", async (_event, locationInput) => {
    const config = configStore.load();
    const resolved = await resolveLocationByCity(locationInput || {}, config, logger);
    logger.info("Location resolved", resolved);
    return resolved;
  });

  ipcMain.handle("app:detectLocation", async () => {
    const resolved = await detectLocationByIp(logger);
    logger.info("Location detected", resolved);
    return resolved;
  });
  ipcMain.handle("app:getPrayerTimes", async () => {
    const config = configStore.load();
    return getPrayerTimes(config, logger);
  });

  ipcMain.handle("app:getAzaanAudioUrl", (_event, prayerKey) => getAzaanAudioUrl(prayerKey));

  ipcMain.handle("app:getDiagnostics", () => ({
    configPath: configStore.configPath,
    logFile: logger.logFile,
    version: app.getVersion(),
    azaanAudioUrl: getAzaanAudioUrl("default"),
    fajrAzaanAudioUrl: getAzaanAudioUrl("fajr")
  }));

  ipcMain.handle("app:openExternal", async (_event, url) => {
    if (!url || !/^https?:\/\//.test(url)) {
      return false;
    }
    await shell.openExternal(url);
    return true;
  });
  ipcMain.handle("app:openPath", async (_event, targetPath) => {
    if (!targetPath) {
      return false;
    }
    await shell.openPath(targetPath);
    return true;
  });
}

app.whenReady().then(() => {
  const bootLogger = createLogger({ appName: "azaan-desktop", userDataPath: app.getPath("userData") });
  logger = bootLogger;
  configStore = createConfigStore(app.getPath("userData"), logger);
  const config = configStore.load();
  logger = createLogger({ appName: "azaan-desktop", userDataPath: app.getPath("userData"), level: config.app.logLevel });

  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

process.on("uncaughtException", (error) => {
  logger?.error("Uncaught exception", error);
});

process.on("unhandledRejection", (reason) => {
  logger?.error("Unhandled rejection", reason instanceof Error ? reason : new Error(String(reason)));
});
