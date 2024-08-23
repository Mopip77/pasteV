import path from "path";
import { app, ipcMain } from "electron";
import serve from "electron-serve";
import { startReadingClipboardDaemon } from "./helpers/read-clipboard-daemon";
import createWindow from "./helpers/create-window";
import { registerHandlers } from "./helpers/ipc-handlers";
import log from "electron-log/main";
import { singletons } from "./components/singletons";
import { DEFAULT_APP_WINDOW_TOGGLE_SHORTCUT, SHORTCUT_KEY_APP_WINDOW_TOGGLE_SHORTCUT } from "./utils/consts";
import { asyncCleanupHistory, registerCleanupScheduler } from "./helpers/cleanup-scheduler";

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

(async () => {
  singletons.initSingletons();
  startReadingClipboardDaemon();
  registerHandlers(ipcMain);

  // Register cleanup scheduler
  registerCleanupScheduler();
  // 主动执行一次清理
  asyncCleanupHistory();

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

  // Hide the window instead of quitting the app
  mainWindow.on("close", (e) => {
    if (!appQuit) {
      e.preventDefault();
      app.hide();
    }
  });

  // Register global shortcuts
  singletons.shortcuts.registerGlobalShortcut(
    SHORTCUT_KEY_APP_WINDOW_TOGGLE_SHORTCUT,
    singletons.settings.loadConfig().appWindowToggleShortcut || DEFAULT_APP_WINDOW_TOGGLE_SHORTCUT,
    () => {
      if (app.isHidden()) {
        mainWindow.setVisibleOnAllWorkspaces(true);
        app.show();
        mainWindow.webContents.send("app:show");
      } else {
        app.hide();
      }
    }
  )
})();

app.on("activate", () => {
  mainWindow.setVisibleOnAllWorkspaces(true);
  app.show();
  mainWindow.webContents.send("app:show");
});

if (isProd) {
  app.on("browser-window-blur", () => {
    app.hide();
  });
}

app.on("before-quit", () => {
  appQuit = true;
});