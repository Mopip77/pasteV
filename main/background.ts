import path from "path";
import { app, ipcMain, globalShortcut } from "electron";
import serve from "electron-serve";
import { startReadingClipboardDaemon } from "./helpers/read-clipboard-daemon";
import { initSingletons, settings } from "./components/singletons";
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

// refs
let mainWindow: Electron.BrowserWindow;
let appWindowToggleShortcut = '';

(async () => {
  initSingletons();
  startReadingClipboardDaemon();
  registerHandlers(ipcMain);

  await app.whenReady();

  mainWindow = createWindow("main", {
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

  registerAppWindowToggleShortcut();
})();

app.on("before-quit", () => {
  appQuit = true;
});

export const registerAppWindowToggleShortcut = () => {
  const newShorcut = settings.loadConfig().appWindowToggleShortcut;
  log.info(`registerAppWindowToggleShortcut, old=${appWindowToggleShortcut}, new=${newShorcut}`);
  if (appWindowToggleShortcut !== newShorcut) {
    if (appWindowToggleShortcut) {
      globalShortcut.unregister(appWindowToggleShortcut);
    }

    globalShortcut.register(newShorcut, () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.setVisibleOnAllWorkspaces(true);
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send("app:show");
      }
    }
    );

    appWindowToggleShortcut = newShorcut;
  }
}