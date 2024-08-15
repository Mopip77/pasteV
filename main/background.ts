import path from "path";
import { app, ipcMain, globalShortcut } from "electron";
import serve from "electron-serve";
import { startReadingClipboardDaemon } from "./helpers/read-clipboard-daemon";
import { initSingletons } from "./components/singletons";
import createWindow from "./helpers/create-window";
import { registerHandlers } from "./helpers/ipc-handlers";
import log from "electron-log/main";

const isProd = process.env.NODE_ENV === "production";
let appQuit = false;

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

log.initialize();
log.transports.file.resolvePathFn = () => path.join(app.getPath("userData"), 'logs/main.log');
log.transports.ipc.level = false;

log.info("background process started");

(async () => {
  initSingletons();
  startReadingClipboardDaemon();
  registerHandlers(ipcMain);

  await app.whenReady();

  const mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
    center: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isProd) {
    await mainWindow.loadURL("app://./home");
  } else {
    mainWindow.webContents.openDevTools();
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
  }

  if (isProd) {
    mainWindow.on("blur", () => {
      mainWindow.hide();
    });
  }

  // Hide the window instead of quitting the app
  mainWindow.on("close", (e) => {
    if (!appQuit) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  const shortcutKey = isProd ? "CommandOrControl+Shift+Option+V" : "CommandOrControl+Shift+J";
  globalShortcut.register(shortcutKey, () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.setVisibleOnAllWorkspaces(true);
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send("app:show");
    }
  });
})();

app.on("before-quit", () => {
  appQuit = true;
});